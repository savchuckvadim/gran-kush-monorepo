import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { MiB } from "../src/common/upload";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);

const extractCookies = (res: request.Response): string => {
    const setCookie = res.headers["set-cookie"];
    const raw: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    return raw.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Контракт ошибок из documentation/backend/HTTP_API_CONTRACT.md: любой сбой — `{ message, errors }`
 * без служебных полей Nest, валидация — `Validation failed` + список нарушений, неизвестное
 * поле — 400, а не тихое срезание. Плюс списки: пагинация и фильтры едут одним query.
 */
describe("Error contract (e2e)", () => {
    let app: INestApplication;
    let portalSlug: string;
    let employeeCookies: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        // Как в main.ts: парсеры тела регистрирует AppModule, пайп и фильтр — тоже
        app = moduleFixture.createNestApplication({ bodyParser: false });
        app.use(cookieParser());
        await app.init();

        portalSlug = `err-${suffix}`;
        const portalRes = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: portalSlug,
                displayName: `Error Contract ${portalSlug}`,
                email: `owner-${suffix}@test.local`,
                password: "Password123",
                ownerName: "Owner",
            });
        expect(portalRes.status).toBe(201);
        employeeCookies = extractCookies(portalRes);
    });

    afterAll(async () => {
        await app?.close();
    });

    const crmGet = (path: string) =>
        request(app.getHttpServer())
            .get(path)
            .set("Cookie", employeeCookies)
            .set("X-Portal-Slug", portalSlug);

    describe("тело ошибки", () => {
        it("валидация → 400, Validation failed, errors[]", async () => {
            const res = await request(app.getHttpServer())
                .post("/platform/portals/register")
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Validation failed");
            expect(Array.isArray(res.body.errors)).toBe(true);
            expect(res.body.errors.length).toBeGreaterThan(0);
            expect(res.body).not.toHaveProperty("statusCode");
        });

        it("неизвестное поле тела → 400 с именем поля, а не тихое срезание", async () => {
            const res = await request(app.getHttpServer())
                .post("/platform/portals/register")
                .send({
                    name: `${portalSlug}-extra`,
                    displayName: "Extra",
                    email: `extra-${suffix}@test.local`,
                    password: "Password123",
                    ownerName: "Owner",
                    extra: "field",
                });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Validation failed");
            expect(res.body.errors).toContain("property extra should not exist");
        });

        it("401 без cookie — message строкой, errors пустой", async () => {
            const res = await request(app.getHttpServer()).get("/crm/auth/me");
            expect(res.status).toBe(401);
            expect(typeof res.body.message).toBe("string");
            expect(res.body.errors).toEqual([]);
            expect(res.body).not.toHaveProperty("statusCode");
        });

        it("404 неизвестного маршрута", async () => {
            const res = await request(app.getHttpServer()).get("/no-such-route");
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ message: "Cannot GET /no-such-route", errors: [] });
        });

        it("битый JSON → 400 от body-parser в том же формате", async () => {
            const res = await request(app.getHttpServer())
                .post("/lk/auth/member/check")
                .set("Content-Type", "application/json")
                .send("{ not json");
            expect(res.status).toBe(400);
            expect(typeof res.body.message).toBe("string");
            expect(res.body.errors).toEqual([]);
            expect(res.body).not.toHaveProperty("statusCode");
        });

        it("тело сверх потолка → 413 в том же формате", async () => {
            const res = await request(app.getHttpServer())
                .post("/lk/auth/member/check")
                .send({ email: `big-${suffix}@test.local`, padding: "a".repeat(2 * MiB) });
            expect(res.status).toBe(413);
            expect(res.body.message).toMatch(/too large/);
            expect(res.body.errors).toEqual([]);
        });
    });

    describe("пагинация и фильтры одним query", () => {
        it.each([
            "/crm/orders?page=1&limit=5&status=pending",
            "/crm/presence/sessions?page=1&limit=5&isActive=false",
            "/crm/finance/transactions?page=1&limit=5&direction=income",
            "/crm/catalog/products?page=1&limit=5&search=kush&isActive=false",
            "/crm/employees?page=1&limit=5&role=admin&isActive=true",
        ])("%s → 200", async (path) => {
            const res = await crmGet(path);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("items");
            expect(res.body.limit).toBe(5);
        });

        it("лишний параметр query → 400 с именем поля", async () => {
            const res = await crmGet("/crm/orders?page=1&foo=bar");
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain("property foo should not exist");
        });

        it.each(["/crm/employees?role=janitor", "/crm/catalog/products?isActive=maybe"])(
            "невалидное значение фильтра %s → 400, а не молчаливый пропуск",
            async (path) => {
                const res = await crmGet(path);
                expect(res.status).toBe(400);
                expect(res.body.message).toBe("Validation failed");
            }
        );

        it("isActive=false остаётся false: сотрудник-владелец активен и в выборку не попадает", async () => {
            const active = await crmGet("/crm/employees?isActive=true");
            const inactive = await crmGet("/crm/employees?isActive=false");
            expect(active.body.total).toBeGreaterThan(0);
            expect(inactive.body.total).toBe(0);
        });
    });
});
