import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { MailService } from "../src/modules/mail/application/services/mail.service";

import { authLinks, LINKS } from "./support/auth-links";
import { mailTokens } from "./support/mail-tokens";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";
const NEW_PASSWORD = "NewPassword456";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Почта владельца клуба в CRM: подтверждение после регистрации и восстановление пароля.
 * Рендер писем в jest не работает (dynamic import), поэтому MailService подменён и
 * проверяется, какое письмо и куда ушло бы. В БД у токенов только хеш: ссылку тест берёт из письма.
 */
describe("CRM email confirmation and password reset (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const mail = {
        sendEmployeeEmailVerification: jest.fn().mockResolvedValue(true),
        sendMamberEmailVerification: jest.fn().mockResolvedValue(true),
        sendPasswordReset: jest.fn().mockResolvedValue(true),
        sendPortalRegistrationEmail: jest.fn().mockResolvedValue(true),
        sendEmail: jest.fn().mockResolvedValue(true),
    };
    const tokens = mailTokens(mail);

    const slug = `email-auth-${suffix}`;
    const email = `owner-${slug}@test.local`;
    let sessionCookies = "";

    const findUser = () => prisma.user.findUniqueOrThrow({ where: { email } });
    const links = () => authLinks(prisma);
    const verificationHash = () => links().latestHash(email, LINKS.emailVerification);
    const resetHash = () => links().latestHash(email, LINKS.password);
    /** Ссылка сброса, которой уже сменили пароль: второй раз она не работает */
    let usedResetToken = "";
    const me = (cookies: string) =>
        request(app.getHttpServer()).get("/crm/auth/me").set("Cookie", cookies);

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(MailService)
            .useValue(mail)
            .compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();

        prisma = app.get(PrismaService);

        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Email auth ${suffix}`,
                email,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
                locale: "es",
            });
        expect(res.status).toBe(201);
        sessionCookies = cookieHeader(res);
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: slug } });
        await prisma.user.deleteMany({ where: { email } });
        await app.close();
    });

    describe("email confirmation", () => {
        it("registration leaves the email unconfirmed and sends a CRM letter in the chosen language", async () => {
            const user = await findUser();
            expect(user.emailConfirmed).toBe(false);
            const hash = await verificationHash();
            expect(hash).toBeTruthy();

            expect(mail.sendEmployeeEmailVerification).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ email }),
                tokens.fromHash(hash),
                "es"
            );
            expect(mail.sendMamberEmailVerification).not.toHaveBeenCalled();

            const meRes = await me(sessionCookies);
            expect(meRes.status).toBe(200);
            expect(meRes.body.emailConfirmed).toBe(false);
        });

        it("resend needs a session, issues a fresh token and the previous letter stops working", async () => {
            const anonymous = await request(app.getHttpServer())
                .post("/crm/auth/confirm-email/resend")
                .send({});
            expect(anonymous.status).toBe(401);

            const before = await verificationHash();
            const previousToken = tokens.fromHash(before);
            const res = await request(app.getHttpServer())
                .post("/crm/auth/confirm-email/resend")
                .set("Cookie", sessionCookies)
                .send({ locale: "ru" });
            expect([200, 201]).toContain(res.status);

            const after = await verificationHash();
            expect(after).toBeTruthy();
            expect(after).not.toBe(before);
            expect(mail.sendEmployeeEmailVerification).toHaveBeenLastCalledWith(
                expect.anything(),
                expect.anything(),
                tokens.fromHash(after),
                "ru"
            );
            const stale = await request(app.getHttpServer())
                .post("/crm/auth/confirm-email")
                .send({ token: previousToken });
            expect(stale.status).toBe(404);
        });

        it("rejects an unknown token", async () => {
            const res = await request(app.getHttpServer())
                .post("/crm/auth/confirm-email")
                .send({ token: "not-a-real-token" });
            expect(res.status).toBe(404);
        });

        it("confirms the email by the token from the letter", async () => {
            const res = await request(app.getHttpServer())
                .post("/crm/auth/confirm-email")
                .send({ token: tokens.fromHash(await verificationHash()) });
            expect([200, 201]).toContain(res.status);
            expect(res.body.success).toBe(true);

            const meRes = await me(sessionCookies);
            expect(meRes.body.emailConfirmed).toBe(true);
        });
    });

    describe("password reset", () => {
        it("answers the same for unknown emails and sends nothing", async () => {
            mail.sendPasswordReset.mockClear();
            const res = await request(app.getHttpServer())
                .post("/crm/auth/password/reset")
                .send({ email: `nobody-${suffix}@test.local` });
            expect([200, 201]).toContain(res.status);
            expect(res.body.success).toBe(true);
            expect(mail.sendPasswordReset).not.toHaveBeenCalled();
        });

        it("sends a link that opens the CRM, not the member portal", async () => {
            const res = await request(app.getHttpServer())
                .post("/crm/auth/password/reset")
                .send({ email, locale: "en" });
            expect([200, 201]).toContain(res.status);

            const hash = await resetHash();
            expect(hash).toBeTruthy();
            expect(mail.sendPasswordReset).toHaveBeenCalledWith(
                expect.objectContaining({ email }),
                expect.any(String),
                tokens.fromHash(hash),
                "en",
                "crm"
            );
        });

        it("keeps the password rule of the registration", async () => {
            const res = await request(app.getHttpServer())
                .post("/crm/auth/password/reset/confirm")
                .send({
                    token: tokens.fromHash(await resetHash()),
                    newPassword: "alllowercase1",
                });
            expect(res.status).toBe(400);
        });

        it("rejects an expired token", async () => {
            const token = tokens.fromHash(await resetHash());
            await links().expire(email, LINKS.password);

            const res = await request(app.getHttpServer())
                .post("/crm/auth/password/reset/confirm")
                .send({ token, newPassword: NEW_PASSWORD });
            expect(res.status).toBe(401);

            await links().renew(email, LINKS.password);
        });

        it("sets the new password and signs out every other session", async () => {
            usedResetToken = tokens.fromHash(await resetHash());

            const res = await request(app.getHttpServer())
                .post("/crm/auth/password/reset/confirm")
                .send({ token: usedResetToken, newPassword: NEW_PASSWORD });
            expect([200, 201]).toContain(res.status);

            const refreshed = await request(app.getHttpServer())
                .post("/crm/auth/refresh")
                .set("Cookie", sessionCookies);
            expect(refreshed.status).toBe(401);

            const oldPassword = await request(app.getHttpServer())
                .post("/crm/auth/login")
                .send({ email, password: PASSWORD });
            expect(oldPassword.status).toBe(401);

            const newPassword = await request(app.getHttpServer())
                .post("/crm/auth/login")
                .send({ email, password: NEW_PASSWORD });
            expect([200, 201]).toContain(newPassword.status);
        });

        it("the token works only once", async () => {
            const again = await request(app.getHttpServer())
                .post("/crm/auth/password/reset/confirm")
                .send({ token: usedResetToken, newPassword: "Another123456" });
            expect(again.status).toBe(404);
            expect(await resetHash()).toBeNull();
        });
    });
});
