import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Сессии CRM: вход сразу после регистрации и ротация refresh-токена.
 */
describe("CRM sessions (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const slug = `sessions-${suffix}`;
    const email = `owner-${slug}@test.local`;

    const login = () =>
        request(app.getHttpServer()).post("/crm/auth/login").send({ email, password: PASSWORD });

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
                displayName: `Sessions ${suffix}`,
                email,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: slug } });
        await prisma.user.deleteMany({ where: { email } });
        await app.close();
    });

    it("logs in twice within the same second", async () => {
        // Регистрация только что выдала пару, а iat у JWT в секундах: без jti
        // второй токен совпадал с первым и вставка падала на уникальном индексе.
        const [first, second] = await Promise.all([login(), login()]);

        expect([200, 201]).toContain(first.status);
        expect([200, 201]).toContain(second.status);
        expect(cookieHeader(first)).not.toBe(cookieHeader(second));
    });

    it("rotates the refresh token: the previous one stops working", async () => {
        const loggedIn = await login();
        expect([200, 201]).toContain(loggedIn.status);
        const issued = cookieHeader(loggedIn);

        const refreshed = await request(app.getHttpServer())
            .post("/crm/auth/refresh")
            .set("Cookie", issued);
        expect([200, 201]).toContain(refreshed.status);
        expect(cookieHeader(refreshed)).not.toBe(issued);

        const replayed = await request(app.getHttpServer())
            .post("/crm/auth/refresh")
            .set("Cookie", issued);
        expect(replayed.status).toBe(401);
    });

    it("lets only one of two concurrent refreshes with the same token through", async () => {
        const loggedIn = await login();
        expect([200, 201]).toContain(loggedIn.status);
        const issued = cookieHeader(loggedIn);

        const refresh = () =>
            request(app.getHttpServer()).post("/crm/auth/refresh").set("Cookie", issued);
        const statuses = (await Promise.all([refresh(), refresh()])).map((r) => r.status);

        expect(statuses.filter((s) => s === 200 || s === 201)).toHaveLength(1);
        expect(statuses.filter((s) => s === 401)).toHaveLength(1);
    });
});
