import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { GoogleOAuthGateway } from "../src/modules/portal/auth/social/domain/google-oauth.gateway";
import { GoogleProfile } from "../src/modules/portal/auth/social/domain/social-profile";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const setCookies = (res: request.Response): string[] => {
    const raw = res.headers["set-cookie"];
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
};
const cookieOf = (res: request.Response, name: string): string | undefined =>
    setCookies(res)
        .find((cookie) => cookie.startsWith(`${name}=`))
        ?.split(";")[0]
        ?.slice(name.length + 1);

/**
 * Редирект-флоу Google с подменённым шлюзом: сети нет, но nonce, PKCE-challenge и state проходят
 * через настоящий сервис. Проверяется защита входа (TASK-705): привязка к браузеру, одноразовость,
 * фильтр страницы возврата.
 */
describe("Google sign-in (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    /** Что «Google» вернёт на обмен кода */
    const google = {
        email: `g-${suffix}@test.local`,
        lastNonce: "",
        lastChallenge: "",
        lastVerifier: "",
    };

    const gateway: GoogleOAuthGateway = {
        isConfigured: () => true,
        buildAuthUrl: (input) => {
            google.lastNonce = input.nonce;
            google.lastChallenge = input.codeChallenge;
            return `https://accounts.example/auth?state=${encodeURIComponent(input.state)}`;
        },
        exchangeCode: async (input): Promise<GoogleProfile> => {
            google.lastVerifier = input.codeVerifier;
            return {
                providerUserId: `sub-${google.email}`,
                email: google.email,
                emailVerified: true,
                displayName: "Google User",
                givenName: "Google",
                familyName: "User",
                locale: "es",
                nonce: google.lastNonce,
            };
        },
    };

    /** Начать вход: куку привязки и state, которые получит браузер. */
    const start = async (path: string, query = "") => {
        const res = await request(app.getHttpServer()).get(`${path}/start?locale=es${query}`);
        expect(res.status).toBe(302);
        const flowCookie = cookieOf(res, "google_oauth_flow");
        const state = new URL(res.headers.location).searchParams.get("state");
        return { res, flowCookie, state: state as string };
    };

    const callback = (path: string, state: string, flowCookie?: string) => {
        const req = request(app.getHttpServer()).get(
            `${path}/callback?code=abc&state=${encodeURIComponent(state)}`
        );
        return flowCookie ? req.set("Cookie", `google_oauth_flow=${flowCookie}`) : req;
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(GoogleOAuthGateway)
            .useValue(gateway)
            .compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    describe("кабинет участника", () => {
        const path = "/cabinet/auth/google";

        it("старт ставит HttpOnly-куку привязки и отправляет Google хеш verifier и nonce", async () => {
            const { res, flowCookie } = await start(path);

            expect(res.headers.location).toContain("https://accounts.example/auth");
            const header = setCookies(res).find((c) => c.startsWith("google_oauth_flow="));
            expect(header).toContain("HttpOnly");
            expect(header).toContain("Path=/cabinet/auth/google");
            expect(header).toContain("SameSite=Lax");

            const [nonce, verifier] = (flowCookie as string).split(".");
            expect(nonce).toBe(google.lastNonce);
            expect(google.lastChallenge).toHaveLength(43);
            expect(google.lastChallenge).not.toBe(verifier);
        });

        it("тот же браузер входит: куки сессии, возврат на страницу из returnTo, кука привязки снята", async () => {
            google.email = `g-ok-${suffix}@test.local`;
            const { flowCookie, state } = await start(path, "&returnTo=/es/join/abc123");

            const res = await callback(path, state, flowCookie);

            expect(res.status).toBe(302);
            expect(new URL(res.headers.location).pathname).toBe("/es/join/abc123");
            expect(cookieOf(res, "member_access_token")).toBeTruthy();
            // Экземпляр куки привязки удаляется: она нужна ровно один раз
            const cleared = setCookies(res).find((c) => c.startsWith("google_oauth_flow=;"));
            expect(cleared).toBeDefined();
            expect(google.lastVerifier).toBe((flowCookie as string).split(".")[1]);
        });

        it("без названной страницы возврата ведёт на главную кабинета", async () => {
            google.email = `g-home-${suffix}@test.local`;
            const { flowCookie, state } = await start(path);

            const res = await callback(path, state, flowCookie);

            expect(new URL(res.headers.location).pathname).toBe("/es");
        });

        it.each([
            "https://evil.example/steal",
            "//evil.example",
            "/es/auth/login",
            "javascript:alert(1)",
        ])("returnTo %s не уводит со своего фронта", async (evil) => {
            google.email = `g-evil-${suffix}@test.local`;
            const { flowCookie, state } = await start(
                path,
                `&returnTo=${encodeURIComponent(evil)}`
            );

            const res = await callback(path, state, flowCookie);

            expect(res.status).toBe(302);
            const location = new URL(res.headers.location);
            expect(location.pathname).toBe("/es");
            expect(location.hostname).not.toBe("evil.example");
        });

        it("чужой браузер без куки не входит — ссылка возврата, подсунутая жертве, бесполезна", async () => {
            google.email = `g-csrf-${suffix}@test.local`;
            const { state } = await start(path);

            const res = await callback(path, state);

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain("/es/auth/login?error=google_auth");
            expect(cookieOf(res, "member_access_token")).toBeFalsy();
            expect(await prisma.user.findUnique({ where: { email: google.email } })).toBeNull();
        });

        it("повтор той же ссылки без уже снятой куки не работает", async () => {
            google.email = `g-replay-${suffix}@test.local`;
            const { flowCookie, state } = await start(path);

            expect((await callback(path, state, flowCookie)).headers.location).not.toContain(
                "error="
            );
            const replay = await callback(path, state);

            expect(replay.headers.location).toContain("error=google_auth");
        });

        it("кука от другого входа не подходит к этому state", async () => {
            google.email = `g-mix-${suffix}@test.local`;
            const first = await start(path);
            const second = await start(path);

            const res = await callback(path, first.state, second.flowCookie);

            expect(res.headers.location).toContain("error=google_auth");
            expect(cookieOf(res, "member_access_token")).toBeFalsy();
        });

        it("state кабинета не принимается на callback CRM", async () => {
            google.email = `g-app-${suffix}@test.local`;
            const { flowCookie, state } = await start(path);

            const res = await callback("/crm/auth/google", state, flowCookie);

            expect(res.headers.location).toContain("error=google_auth");
        });
    });

    describe("CRM", () => {
        const path = "/crm/auth/google";

        it("аккаунта нет — на регистрацию клуба с email, аккаунт не создаётся", async () => {
            google.email = `g-crm-new-${suffix}@test.local`;
            const { flowCookie, state } = await start(path);

            const res = await callback(path, state, flowCookie);

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain("/es/auth/register?email=");
            expect(res.headers.location).toContain("from=google");
            expect(await prisma.user.findUnique({ where: { email: google.email } })).toBeNull();
        });

        it("владелец клуба входит и возвращается на указанную страницу", async () => {
            const slug = `g-${suffix}`;
            google.email = `owner-${slug}@test.local`;
            const registered = await request(app.getHttpServer())
                .post("/platform/portals/register")
                .send({
                    name: slug,
                    displayName: `Google ${slug}`,
                    email: google.email,
                    password: PASSWORD,
                    ownerName: "Owner",
                    acceptTerms: true,
                });
            expect(registered.status).toBe(201);

            try {
                const { flowCookie, state } = await start(
                    path,
                    `&returnTo=/es/${slug}/crm/members`
                );
                const res = await callback(path, state, flowCookie);

                expect(new URL(res.headers.location).pathname).toBe(`/es/${slug}/crm/members`);
                expect(cookieOf(res, "crm_access_token")).toBeTruthy();
            } finally {
                await prisma.portal.deleteMany({ where: { name: slug } });
            }
        });

        describe("приглашение сотрудника (intent=invitation)", () => {
            const slug = `g-inv-${suffix}`;
            let ownerCookies: string;

            const invite = async (email: string): Promise<string> => {
                const res = await request(app.getHttpServer())
                    .post("/crm/settings/invitations")
                    .set("Cookie", ownerCookies)
                    .set("X-Portal-Slug", slug)
                    .send({ email, role: "employee" });
                expect(res.status).toBe(201);
                return res.body.token as string;
            };

            beforeAll(async () => {
                const registered = await request(app.getHttpServer())
                    .post("/platform/portals/register")
                    .send({
                        name: slug,
                        displayName: `Invite ${slug}`,
                        email: `owner-${slug}@test.local`,
                        password: PASSWORD,
                        ownerName: "Owner",
                        acceptTerms: true,
                    });
                expect(registered.status).toBe(201);
                ownerCookies = setCookies(registered)
                    .map((cookie) => cookie.split(";")[0])
                    .join("; ");
            });

            afterAll(async () => {
                await prisma.portal.deleteMany({ where: { name: slug } });
            });

            it("адрес Google совпал: аккаунт заведён, сотрудник создан, сессия CRM, вход в клуб", async () => {
                google.email = `g-invitee-${suffix}@test.local`;
                const token = await invite(google.email);

                const { flowCookie, state } = await start(
                    path,
                    `&intent=invitation&token=${token}`
                );
                const res = await callback(path, state, flowCookie);

                expect(new URL(res.headers.location).pathname).toBe(`/es/${slug}/crm`);
                expect(cookieOf(res, "crm_access_token")).toBeTruthy();
                const user = await prisma.user.findUniqueOrThrow({
                    where: { email: google.email },
                });
                expect(user.emailConfirmed).toBe(true);
                expect(
                    await prisma.employee.count({
                        where: { userId: user.id, portal: { name: slug } },
                    })
                ).toBe(1);
                const invitation = await prisma.employeeInvitation.findUniqueOrThrow({
                    where: { token },
                });
                expect(invitation.status).toBe("accepted");
            });

            it("чужой адрес Google: назад к приглашению, аккаунт не заводится, сессии нет", async () => {
                const token = await invite(`g-invited-${suffix}@test.local`);
                google.email = `g-stranger-${suffix}@test.local`;

                const { flowCookie, state } = await start(
                    path,
                    `&intent=invitation&token=${token}`
                );
                const res = await callback(path, state, flowCookie);

                const location = new URL(res.headers.location);
                expect(location.pathname).toBe(`/es/auth/invite/${token}`);
                expect(location.searchParams.get("error")).toBe("invite_email_mismatch");
                expect(cookieOf(res, "crm_access_token")).toBeFalsy();
                expect(await prisma.user.findUnique({ where: { email: google.email } })).toBeNull();
            });

            it("токен приглашения неправильной формы отбрасывается при старте: это обычный вход", async () => {
                google.email = `g-plain-${suffix}@test.local`;
                const { flowCookie, state } = await start(path, "&intent=invitation&token=../../x");

                const res = await callback(path, state, flowCookie);

                expect(res.headers.location).toContain("/es/auth/register?email=");
            });
        });
    });
});
