import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import * as bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { LOGIN_FAILURES } from "../src/common/config/throttler/throttler.config";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { MailService } from "../src/modules/mail/application/services/mail.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

/**
 * Перебор и разведка адресов (TASK-665, TASK-667): регистрация не выдаёт, занят ли адрес, а
 * неудачные входы на один адрес упираются в лимит даже с разных IP.
 */
describe("Sign-in abuse (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let accountExists: jest.SpyInstance;
    let verification: jest.SpyInstance;

    const http = () => request(app.getHttpServer());
    const account = async (name: string) => {
        const email = `${name}-${suffix}@test.local`;
        await prisma.user.create({
            data: {
                email,
                passwordHash: await bcrypt.hash(PASSWORD, 4),
                status: "active",
                isActive: true,
                emailConfirmed: true,
            },
        });
        return email;
    };
    const register = (email: string) =>
        http().post("/cabinet/auth/member/register").send({ email, password: "Another12345" });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);
        const mail = app.get(MailService);
        // письма в jest не рендерятся (dynamic import): перехватываем отправку
        accountExists = jest.spyOn(mail, "sendAccountExists").mockResolvedValue(true);
        verification = jest.spyOn(mail, "sendMemberEmailVerification").mockResolvedValue(true);
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("registration answers the same for a taken and a new email; the owner gets a letter", async () => {
        const taken = await account("taken");
        const fresh = `fresh-${suffix}@test.local`;

        const onTaken = await register(taken);
        const onFresh = await register(fresh);

        expect(onTaken.status).toBe(201);
        expect(onFresh.status).toBe(201);
        expect(onTaken.body).toEqual({ email: taken, awaitingEmailConfirmation: true });
        expect(onFresh.body).toEqual({ email: fresh, awaitingEmailConfirmation: true });

        expect(accountExists).toHaveBeenCalledWith(expect.objectContaining({ to: taken }));
        expect(accountExists).not.toHaveBeenCalledWith(expect.objectContaining({ to: fresh }));
        expect(verification).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ email: fresh }),
            expect.any(String),
            expect.any(String)
        );

        // пароль из формы к занятому аккаунту не применился
        const login = await http()
            .post("/cabinet/auth/login")
            .send({ email: taken, password: "Another12345" });
        expect(login.status).toBe(401);
    });

    it("too many failed sign-ins lock the password sign-in of that email only", async () => {
        const victim = await account("victim");
        const bystander = await account("bystander");
        const login = (email: string, password: string) =>
            http().post("/crm/auth/login").send({ email, password });

        for (let i = 0; i < LOGIN_FAILURES.maxFailures; i += 1) {
            expect((await login(victim, `Wrong-${i}-12345`)).status).toBe(401);
        }

        const locked = await login(victim, PASSWORD);
        expect(locked.status).toBe(429);
        expect(locked.body.code).toBe("too_many_attempts");
        // и в кабинете: счётчик — на адрес, а не на приложение
        expect(
            (await http().post("/cabinet/auth/login").send({ email: victim, password: PASSWORD }))
                .status
        ).toBe(429);

        expect((await login(bystander, PASSWORD)).status).toBe(201);
    });

    it("a successful sign-in resets the failure counter", async () => {
        const email = await account("reset");
        const login = (password: string) =>
            http().post("/cabinet/auth/login").send({ email, password });

        for (let i = 0; i < LOGIN_FAILURES.maxFailures - 1; i += 1) {
            expect((await login(`Wrong-${i}-12345`)).status).toBe(401);
        }
        expect((await login(PASSWORD)).status).toBe(201);
        expect((await login("Wrong-again-12345")).status).toBe(401);
        expect((await login(PASSWORD)).status).toBe(201);
    });
});
