import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { MemberAuthService } from "../src/modules/portal/auth/members/application/services/member-auth.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Ссылки-формы регистрации: личная ссылка с предзаполнением, статусы, отзыв,
 * онлайн-зрители и постраничный список.
 */
describe("Registration links (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const slug = `reglinks-${suffix}`;
    const ownerEmail = `owner-${slug}@test.local`;
    let cookies: string;

    const admin = () => ({
        get: (url: string) =>
            request(app.getHttpServer()).get(url).set("Cookie", cookies).set("X-Portal-Slug", slug),
        post: (url: string) =>
            request(app.getHttpServer())
                .post(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", slug),
        patch: (url: string) =>
            request(app.getHttpServer())
                .patch(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", slug),
    });

    const createLink = async (body: Record<string, unknown>) => {
        const res = await admin().post("/crm/settings/registration-links").send(body);
        expect(res.status).toBe(201);
        return res.body as { id: string; token: string; status: string; hasPrefill: boolean };
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();

        prisma = app.get(PrismaService);

        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Reg Links ${suffix}`,
                email: ownerEmail,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        cookies = cookieHeader(res);
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: slug } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    describe("personal link with prefill", () => {
        it("opens the public form with the stored values and is spent after one sign-up", async () => {
            const link = await createLink({
                name: "Для Ñandú",
                kind: "personal",
                prefill: {
                    email: "Nandu@Example.com",
                    fields: { first_name: "Ñandú", last_name: "" },
                },
            });
            expect(link.hasPrefill).toBe(true);
            expect(link.status).toBe("ready");

            const info = await request(app.getHttpServer()).get(`/public/reg-links/${link.token}`);
            expect(info.status).toBe(200);
            expect(info.body.prefill).toEqual({
                email: "nandu@example.com",
                fields: { first_name: "Ñandú" },
            });

            const signUp = await request(app.getHttpServer())
                .post(`/public/reg-links/${link.token}/register`)
                .send({
                    email: `nandu-${suffix}@test.local`,
                    password: PASSWORD,
                    fields: { first_name: "Ñandú" },
                });
            expect(signUp.status).toBe(201);

            const again = await request(app.getHttpServer()).get(`/public/reg-links/${link.token}`);
            expect(again.status).toBe(404);

            const list = await admin().get("/crm/settings/registration-links?status=exhausted");
            expect(list.status).toBe(200);
            expect(list.body.links.map((l: { id: string }) => l.id)).toContain(link.id);
        });

        it("rejects unknown prefill keys", async () => {
            const res = await admin()
                .post("/crm/settings/registration-links")
                .send({
                    name: "x",
                    kind: "personal",
                    prefill: { email: "a@b.c", portalId: "evil" },
                });
            expect(res.status).toBe(400);
        });
    });

    describe("join under a session", () => {
        // Токены выписываются напрямую: настоящий вход упирается в лимит логинов на сьют
        const accountWithSession = async (label: string) => {
            const email = `${label}-${suffix}@test.local`;
            const user = await prisma.user.create({
                data: {
                    email,
                    passwordHash: "not-a-real-hash",
                    isActive: true,
                    emailConfirmed: true,
                },
            });
            const tokens = await app
                .get(MemberAuthService)
                .generateTokens({ id: user.id, email }, `device-${label}-${suffix}`);
            return { userId: user.id, cookies: `member_access_token=${tokens.accessToken}` };
        };

        const join = (token: string, cookies: string, body: Record<string, unknown> = {}) =>
            request(app.getHttpServer())
                .post(`/cabinet/reg-links/${token}/join`)
                .set("Cookie", cookies)
                .send({ fields: { first_name: "Ñandú" }, ...body });

        it("needs a session", async () => {
            const link = await createLink({ name: "Без сессии", kind: "public_link" });

            const res = await request(app.getHttpServer())
                .post(`/cabinet/reg-links/${link.token}/join`)
                .send({});

            expect(res.status).toBe(401);
        });

        it("joins the signed-in account, spends the slot and refuses a second join", async () => {
            const { userId, cookies: session } = await accountWithSession("join-a");
            const link = await createLink({ name: "Одно место", kind: "public_link", maxUses: 1 });

            const res = await join(link.token, session);
            expect(res.status).toBe(201);
            expect(res.body.portalSlug).toBe(slug);

            const member = await prisma.member.findFirst({
                where: { userId, portal: { name: slug } },
            });
            expect(member?.id).toBe(res.body.memberId);
            expect(member?.registrationLinkId).toBe(link.id);
            expect(member?.consentStatus).toBe("confirmed");

            const again = await join(link.token, session);
            expect(again.status).toBe(404);
        });

        it("does not burn the slot when the account is already a member", async () => {
            const { cookies: session } = await accountWithSession("join-b");
            const first = await createLink({ name: "Первая", kind: "public_link" });
            const second = await createLink({ name: "Вторая", kind: "public_link", maxUses: 1 });

            expect((await join(first.token, session)).status).toBe(201);
            expect((await join(second.token, session)).status).toBe(409);

            const row = await prisma.registrationLink.findUnique({ where: { id: second.id } });
            expect(row?.usesCount).toBe(0);
        });

        it("a personal link works only for its own address", async () => {
            const { userId, cookies: session } = await accountWithSession("join-c");
            const stranger = await createLink({
                name: "Чужая",
                kind: "personal",
                prefill: { email: `someone-else-${suffix}@test.local` },
            });
            const own = await createLink({
                name: "Своя",
                kind: "personal",
                prefill: { email: `join-c-${suffix}@test.local` },
            });

            expect((await join(stranger.token, session)).status).toBe(403);
            expect(
                (await prisma.registrationLink.findUnique({ where: { id: stranger.id } }))
                    ?.usesCount
            ).toBe(0);

            expect((await join(own.token, session)).status).toBe(201);
            expect(await prisma.member.count({ where: { userId } })).toBe(1);
        });

        it("rejects documents that are not the account's own", async () => {
            const { userId, cookies: session } = await accountWithSession("join-d");
            const link = await createLink({ name: "Чужой документ", kind: "public_link" });

            const res = await join(link.token, session, {
                shareDocumentIds: ["00000000-0000-4000-8000-000000000000"],
            });

            expect(res.status).toBe(400);
            expect(await prisma.member.count({ where: { userId } })).toBe(0);
            const row = await prisma.registrationLink.findUnique({ where: { id: link.id } });
            expect(row?.usesCount).toBe(0);
        });
    });

    describe("revoke", () => {
        it("is final: the public page stops opening and the link cannot be re-enabled", async () => {
            const link = await createLink({ name: "Стойка", kind: "public_link" });

            const revoked = await admin().post(
                `/crm/settings/registration-links/${link.id}/revoke`
            );
            expect(revoked.status).toBe(201);
            expect(revoked.body.status).toBe("revoked");

            const info = await request(app.getHttpServer()).get(`/public/reg-links/${link.token}`);
            expect(info.status).toBe(404);

            const reenabled = await admin()
                .patch(`/crm/settings/registration-links/${link.id}`)
                .send({ isActive: true });
            expect(reenabled.status).toBe(200);
            expect(reenabled.body.status).toBe("revoked");
        });
    });

    describe("presence", () => {
        it("counts viewers while the form is open and drops them on leave", async () => {
            const link = await createLink({ name: "Планшет", kind: "kiosk" });
            const ping = (viewerId: string) =>
                request(app.getHttpServer())
                    .post(`/public/reg-links/${link.token}/ping`)
                    .send({ viewerId });

            expect((await ping("tab-aaaa-1111")).body.online).toBe(1);
            expect((await ping("tab-bbbb-2222")).body.online).toBe(2);
            expect((await ping("tab-aaaa-1111")).body.online).toBe(2);

            const list = await admin().get("/crm/settings/registration-links?limit=50");
            const row = list.body.links.find((l: { id: string }) => l.id === link.id);
            expect(row.online).toBe(2);

            const left = await request(app.getHttpServer())
                .post(`/public/reg-links/${link.token}/leave`)
                .send({ viewerId: "tab-aaaa-1111" });
            expect(left.body.online).toBe(1);
        });

        it("ignores heartbeats for a dead link", async () => {
            const res = await request(app.getHttpServer())
                .post(`/public/reg-links/no-such-token/ping`)
                .send({ viewerId: "tab-cccc-3333" });
            expect(res.status).toBe(404);
        });
    });

    describe("list", () => {
        it("paginates and filters by status", async () => {
            const disabled = await createLink({ name: "Выключенная" });
            await admin()
                .patch(`/crm/settings/registration-links/${disabled.id}`)
                .send({ isActive: false });

            const page = await admin().get("/crm/settings/registration-links?page=1&limit=2");
            expect(page.status).toBe(200);
            expect(page.body.links).toHaveLength(2);
            expect(page.body.total).toBeGreaterThanOrEqual(4);
            expect(page.body.totalPages).toBeGreaterThanOrEqual(2);
            expect(page.body.links[0]).toEqual(
                expect.objectContaining({
                    status: expect.any(String),
                    online: expect.any(Number),
                    createdBy: expect.objectContaining({ email: ownerEmail }),
                })
            );

            const onlyDisabled = await admin().get(
                "/crm/settings/registration-links?status=disabled"
            );
            expect(onlyDisabled.body.links.map((l: { id: string }) => l.id)).toEqual([disabled.id]);

            const ready = await admin().get("/crm/settings/registration-links?status=ready");
            expect(ready.body.links.map((l: { id: string }) => l.id)).not.toContain(disabled.id);
        });
    });
});
