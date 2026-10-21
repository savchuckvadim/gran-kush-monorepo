import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { MailService } from "../src/modules/mail/application/services/mail.service";
import { SessionsService } from "../src/modules/portal/auth/sessions/application/sessions.service";

import { startTestSession } from "./support/sessions";

jest.setTimeout(120_000);

/** Почта без SMTP: каждый метод MailService — пустой jest.fn. */
const mailStub = () =>
    Object.fromEntries(
        Object.getOwnPropertyNames(MailService.prototype)
            .filter((name) => name !== "constructor")
            .map((name) => [name, jest.fn().mockResolvedValue(undefined)])
    );

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";
const GUARDED = "/platform/admin/billing/plans";

/**
 * Вход в админку платформы — сессия `auth_sessions` с аудиторией `platform` (R1 аудита auth
 * 2026-10-17): выход и смена пароля гасят доступ сразу, токены не годятся в CRM и обратно.
 */
describe("Platform admin sessions (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let userId = "";
    const email = `platform-admin-${suffix}@test.local`;

    const login = () =>
        request(app.getHttpServer())
            .post("/platform/auth/login")
            .send({ email, password: PASSWORD });
    const guarded = (accessToken: string) =>
        request(app.getHttpServer()).get(GUARDED).set("Authorization", `Bearer ${accessToken}`);

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(MailService)
            .useValue(mailStub())
            .compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: await bcrypt.hash(PASSWORD, 10),
                isActive: true,
                emailConfirmed: true,
            },
        });
        userId = user.id;
        await prisma.platformAdmin.create({ data: { userId } });
    });

    afterAll(async () => {
        await prisma?.user.deleteMany({ where: { email } });
        await app?.close();
    });

    it("login starts a platform session and its access opens admin routes", async () => {
        const res = await login();
        expect(res.status).toBe(201);
        expect(res.body.admin.email).toBe(email);
        expect(typeof res.body.refreshToken).toBe("string");

        const session = await prisma.authSession.findFirst({
            where: { userId, audience: "platform", revokedAt: null },
        });
        expect(session).not.toBeNull();
        expect((await guarded(res.body.accessToken as string)).status).toBe(200);
    });

    it("logout ends the session at once, before the access token expires", async () => {
        const { body } = await login();
        expect((await guarded(body.accessToken as string)).status).toBe(200);

        const out = await request(app.getHttpServer())
            .post("/platform/auth/logout")
            .send({ refreshToken: body.refreshToken });
        expect(out.status).toBe(204);
        expect((await guarded(body.accessToken as string)).status).toBe(401);
    });

    it("refresh rotates the pair; a stolen old refresh is refused", async () => {
        const { body } = await login();
        const rotated = await request(app.getHttpServer())
            .post("/platform/auth/refresh")
            .send({ refreshToken: body.refreshToken });
        expect(rotated.status).toBe(200);
        expect(rotated.body.refreshToken).not.toBe(body.refreshToken);
        expect((await guarded(rotated.body.accessToken as string)).status).toBe(200);

        const replay = await request(app.getHttpServer())
            .post("/platform/auth/refresh")
            .send({ refreshToken: body.refreshToken });
        expect(replay.status).toBe(401);
    });

    it("signing out everywhere (password change) closes admin sessions too", async () => {
        const { body } = await login();
        await app.get(SessionsService).endAllForUser(userId, "password_changed");
        expect((await guarded(body.accessToken as string)).status).toBe(401);
    });

    it("a deactivated admin is refused with a live session", async () => {
        const { body } = await login();
        await prisma.platformAdmin.update({ where: { userId }, data: { isActive: false } });
        try {
            expect((await guarded(body.accessToken as string)).status).toBe(401);
        } finally {
            await prisma.platformAdmin.update({ where: { userId }, data: { isActive: true } });
        }
    });

    it("tokens do not cross audiences", async () => {
        const crm = await startTestSession(app, userId, "crm");
        expect((await guarded(crm.accessToken)).status).toBe(401);

        const { body } = await login();
        const me = await request(app.getHttpServer())
            .get("/crm/auth/me")
            .set("Authorization", `Bearer ${body.accessToken as string}`);
        expect(me.status).toBe(401);
    });

    it("admin sessions stay out of the account's device list", async () => {
        await login();
        const platform = await prisma.authSession.findMany({
            where: { userId, audience: "platform", revokedAt: null },
            select: { id: true },
        });
        expect(platform.length).toBeGreaterThan(0);
        const listed = new Set(
            (await app.get(SessionsService).listForUser(userId)).map((s) => s.id)
        );
        expect(platform.some((s) => listed.has(s.id))).toBe(false);
    });
});
