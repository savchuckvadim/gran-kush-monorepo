import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import * as bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { GoogleOAuthGateway } from "../src/modules/portal/auth/identity/domain/google-oauth.gateway";
import { GoogleProfile } from "../src/modules/portal/auth/identity/domain/google-profile";

import { cabinetSession } from "./support/sessions";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";
const NEW_PASSWORD = "NewPassword456";

const setCookies = (res: request.Response): string[] => {
    const raw = res.headers["set-cookie"];
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
};
/** Способ входа Google в ответе «Вход и безопасность» */
const googleOf = (body: { methods: { provider: string; linked?: boolean }[] }) =>
    body.methods.find((method) => method.provider === "google");

const cookieOf = (res: request.Response, name: string): string | undefined =>
    setCookies(res)
        .find((cookie) => cookie.startsWith(`${name}=`))
        ?.split(";")[0]
        ?.slice(name.length + 1);

/**
 * Вход и безопасность аккаунта (TASK-716): пароль, привязка и отвязка Google, выход со всех
 * устройств. Google подменён шлюзом, флоу (state, кука привязки, PKCE) — настоящий.
 */
describe("Account security (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    /** Кто «вошёл» в Google на следующем обмене кода */
    const google = { sub: "", email: "", nonce: "" };

    const gateway: GoogleOAuthGateway = {
        isConfigured: () => true,
        buildAuthUrl: (input) => {
            google.nonce = input.nonce;
            return `https://accounts.example/auth?state=${encodeURIComponent(input.state)}`;
        },
        exchangeCode: async (): Promise<GoogleProfile> => ({
            providerUserId: google.sub,
            email: google.email,
            emailVerified: true,
            displayName: "Google User",
            givenName: "Google",
            familyName: "User",
            locale: "es",
            nonce: google.nonce,
        }),
    };

    /** Аккаунт и его сессия на одном устройстве */
    const account = async (name: string, password: string | null) => {
        const email = `${name}-${suffix}@test.local`;
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: password ? await bcrypt.hash(password, 4) : null,
                status: "active",
                isActive: true,
                emailConfirmed: true,
            },
        });
        const tokens = await cabinetSession(app, user.id, `device-${name}-${suffix}`);
        return {
            user,
            email,
            refresh: tokens.refreshToken,
            cookies: tokens.cookies,
        };
    };

    const security = (cookies: string) => ({
        get: () =>
            request(app.getHttpServer()).get("/cabinet/account/security").set("Cookie", cookies),
        password: (body: object) =>
            request(app.getHttpServer())
                .put("/cabinet/account/security/password")
                .set("Cookie", cookies)
                .send(body),
        unlink: () =>
            request(app.getHttpServer())
                .delete("/cabinet/account/security/google")
                .set("Cookie", cookies),
        signOut: () =>
            request(app.getHttpServer())
                .post("/cabinet/account/security/sign-out-everywhere")
                .set("Cookie", cookies),
    });

    const refresh = (token: string) =>
        request(app.getHttpServer())
            .post("/cabinet/auth/refresh")
            .set("Cookie", `cabinet_refresh=${token}`);

    /** Привязка Google: старт под сессией, «возврат» от Google тем же браузером. */
    const linkGoogle = async (cookies: string, sub: string, email: string) => {
        google.sub = sub;
        google.email = email;
        const start = await request(app.getHttpServer())
            .get("/cabinet/auth/google/link?locale=es")
            .set("Cookie", cookies);
        expect(start.status).toBe(302);
        const state = new URL(start.headers.location).searchParams.get("state") ?? "";
        const flow = cookieOf(start, "oauth_flow") ?? "";
        const back = await request(app.getHttpServer())
            .get(`/cabinet/auth/google/callback?code=abc&state=${encodeURIComponent(state)}`)
            .set("Cookie", `oauth_flow=${flow}`);
        expect(back.status).toBe(302);
        return new URL(back.headers.location);
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

    it("a password needs the current one; the change ends every other session and keeps this one", async () => {
        const ana = await account("ana", PASSWORD);
        const otherDevice = await cabinetSession(app, ana.user.id);
        const overview = (await security(ana.cookies).get()).body;
        expect(overview).toMatchObject({ email: ana.email, hasPassword: true });
        expect(googleOf(overview)).toEqual({
            provider: "google",
            flow: "redirect",
            available: true,
            linked: false,
            email: null,
            username: null,
        });

        const missing = await security(ana.cookies).password({ newPassword: NEW_PASSWORD });
        expect(missing.status).toBe(400);
        expect(missing.body.code).toBe("wrong_password");
        const wrong = await security(ana.cookies).password({
            currentPassword: "Wrong12345",
            newPassword: NEW_PASSWORD,
        });
        expect(wrong.body.code).toBe("wrong_password");
        const weak = await security(ana.cookies).password({
            currentPassword: PASSWORD,
            newPassword: "short",
        });
        expect(weak.status).toBe(400);

        const changed = await security(ana.cookies).password({
            currentPassword: PASSWORD,
            newPassword: NEW_PASSWORD,
        });
        expect(changed.status).toBe(200);
        expect((await security(ana.cookies).get()).status).toBe(200);
        expect((await refresh(ana.refresh)).status).toBe(201);
        expect((await security(otherDevice.cookies).get()).status).toBe(401);
        expect((await refresh(otherDevice.refreshToken)).status).toBe(401);

        const login = (password: string) =>
            request(app.getHttpServer())
                .post("/cabinet/auth/login")
                .send({ email: ana.email, password });
        expect((await login(PASSWORD)).status).toBe(401);
        expect((await login(NEW_PASSWORD)).status).toBe(201);
    });

    it("Google links to the signed-in account, is shown, and is unlinked only while a password exists", async () => {
        const bob = await account("bob", PASSWORD);
        const unauthorized = await request(app.getHttpServer()).get("/cabinet/auth/google/link");
        expect(unauthorized.status).toBe(401);

        const result = await linkGoogle(
            bob.cookies,
            `sub-bob-${suffix}`,
            `bob.g-${suffix}@test.local`
        );
        expect(result.pathname).toBe("/es/me");
        expect(result.searchParams.get("google")).toBe("linked");
        expect(googleOf((await security(bob.cookies).get()).body)).toMatchObject({
            linked: true,
            email: `bob.g-${suffix}@test.local`,
        });

        // the same Google can not be moved to another account
        const eve = await account("eve", PASSWORD);
        const taken = await linkGoogle(
            eve.cookies,
            `sub-bob-${suffix}`,
            `bob.g-${suffix}@test.local`
        );
        expect(taken.searchParams.get("google")).toBe("google_taken");
        expect(googleOf((await security(eve.cookies).get()).body)?.linked).toBe(false);

        const unlinked = await security(bob.cookies).unlink();
        expect(unlinked.status).toBe(200);
        expect(googleOf(unlinked.body)).toMatchObject({ linked: false, email: null });
        expect((await security(bob.cookies).unlink()).body.code).toBe("google_not_linked");
    });

    it("a Google-only account keeps Google until it sets a password, which needs no current one", async () => {
        const gia = await account("gia", null);
        await linkGoogle(gia.cookies, `sub-gia-${suffix}`, `gia-${suffix}@test.local`);

        const refused = await security(gia.cookies).unlink();
        expect(refused.status).toBe(409);
        expect(refused.body.code).toBe("last_sign_in_method");

        const set = await security(gia.cookies).password({ newPassword: NEW_PASSWORD });
        expect(set.status).toBe(200);
        expect(set.body.hasPassword).toBe(true);
        expect((await security(gia.cookies).unlink()).status).toBe(200);
    });

    it("signing out everywhere revokes the sessions of the account", async () => {
        const dan = await account("dan", PASSWORD);
        const rotated = await refresh(dan.refresh);
        expect(rotated.status).toBe(201);
        const again = cookieOf(rotated, "cabinet_refresh");
        expect(again).toBeTruthy();

        const out = await security(dan.cookies).signOut();
        expect(out.status).toBe(204);
        expect((await refresh(again as string)).status).toBe(401);
        expect((await security(dan.cookies).get()).status).toBe(401);
    });
});
