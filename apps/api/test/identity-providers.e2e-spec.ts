import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import * as bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { GoogleOAuthGateway } from "../src/modules/portal/auth/identity/domain/google-oauth.gateway";

import { crmSession } from "./support/sessions";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);

/**
 * Реестр способов входа (TASK-737) и «Вход и безопасность» в CRM (TASK-738): маршруты
 * `/{aud}/auth/{provider}/…` общие для провайдеров, неизвестный провайдер — 404, привязка требует
 * сессии своего приложения.
 */
describe("Sign-in providers (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let cookies: string;
    const email = `providers-${suffix}@test.local`;

    const gateway: GoogleOAuthGateway = {
        isConfigured: () => true,
        buildAuthUrl: (input) =>
            `https://accounts.example/auth?state=${encodeURIComponent(input.state)}`,
        exchangeCode: () => Promise.reject(new Error("not used")),
    };

    const http = () => request(app.getHttpServer());

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

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: await bcrypt.hash("Password123", 4),
                status: "active",
                isActive: true,
                emailConfirmed: true,
            },
        });
        cookies = (await crmSession(app, user.id)).cookies;
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { email } });
        await app.close();
    });

    it("lists the providers of the app with their button settings", async () => {
        const res = await http().get("/crm/auth/providers");
        expect(res.status).toBe(200);
        expect(res.body.providers).toContainEqual({ key: "google", flow: "redirect", config: {} });
    });

    it("an unknown provider is a 404, not a redirect", async () => {
        expect((await http().get("/crm/auth/vk/start")).status).toBe(404);
        expect((await http().post("/cabinet/auth/vk/verify").send({ payload: {} })).status).toBe(
            404
        );
        const unlink = await http().delete("/crm/account/security/vk").set("Cookie", cookies);
        expect(unlink.status).toBe(404);
        expect(unlink.body.code).toBe("identity_unknown");
    });

    it("a redirect provider can not be verified as a widget", async () => {
        const res = await http().post("/cabinet/auth/google/verify").send({ payload: {} });
        expect(res.status).toBe(503);
        expect(res.body.code).toBe("google_off");
    });

    it("starting a sign-in sets the flow cookie on the provider routes only", async () => {
        const res = await http().get("/crm/auth/google/start?locale=es&intent=club_signup");
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain("https://accounts.example/auth");
        const cookie = (res.headers["set-cookie"] as unknown as string[]).find((c) =>
            c.startsWith("oauth_flow=")
        );
        expect(cookie).toMatch(/Path=\/crm\/auth\/google/);
        expect(cookie).toMatch(/HttpOnly/);
    });

    it("linking needs a session of the same app", async () => {
        expect((await http().get("/crm/auth/google/link")).status).toBe(401);
        const cabinetCookie = cookies.replace("crm_access=", "cabinet_access=");
        expect(
            (await http().get("/cabinet/auth/google/link").set("Cookie", cabinetCookie)).status
        ).toBe(401);
        const linked = await http().get("/crm/auth/google/link?locale=ru").set("Cookie", cookies);
        expect(linked.status).toBe(302);
    });

    it("the CRM shows the same account security as the cabinet", async () => {
        const res = await http().get("/crm/account/security").set("Cookie", cookies);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ email, hasPassword: true });
        expect(res.body.methods).toContainEqual(
            expect.objectContaining({ provider: "google", available: true, linked: false })
        );
        const notLinked = await http()
            .delete("/crm/account/security/google")
            .set("Cookie", cookies);
        expect(notLinked.status).toBe(404);
        expect(notLinked.body.code).toBe("google_not_linked");
    });
});
