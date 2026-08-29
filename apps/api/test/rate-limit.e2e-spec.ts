import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);

/**
 * Лимиты объявлены в common/config/throttler/throttler.config.ts. Тест проверяет не
 * конкретные числа, а что контроль вообще срабатывает: раньше rate limiting не было
 * совсем, и подбор пароля с рассылкой писем не упирались ни во что.
 */
describe("Rate limiting (e2e)", () => {
    let app: INestApplication;

    const hammer = async (send: () => request.Test, times: number): Promise<number[]> => {
        const statuses: number[] = [];
        for (let i = 0; i < times; i += 1) {
            const res = await send();
            statuses.push(res.status);
        }
        return statuses;
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
        app.use(cookieParser());
        await app.init();
    });

    afterAll(async () => {
        await app?.close();
    });

    it("запрос сброса пароля упирается в лимит — иначе это рассылка с нашего SMTP", async () => {
        const statuses = await hammer(
            () =>
                request(app.getHttpServer())
                    .post("/auth/password/reset/request")
                    .send({ email: `nobody-${suffix}@test.local` }),
            12
        );

        expect(statuses).toContain(429);
        // Первый запрос обязан пройти: лимит защищает от шторма, а не ломает сценарий.
        expect(statuses[0]).not.toBe(429);
    });

    it("подбор пароля упирается в лимит", async () => {
        const statuses = await hammer(
            () =>
                request(app.getHttpServer())
                    .post("/platform/auth/login")
                    .send({ email: `nobody-${suffix}@test.local`, password: "WrongPassword1" }),
            30
        );

        expect(statuses).toContain(429);
    });

    it("не-чувствительный маршрут не режется теми же жёсткими лимитами", async () => {
        const statuses = await hammer(() => request(app.getHttpServer()).get("/health"), 30);

        expect(statuses.every((s) => s === 200)).toBe(true);
    });
});
