import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";
const ENTITY_CODE = "vendor";

function extractCookies(res: request.Response): string {
    const setCookie = res.headers["set-cookie"];
    const raw: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    return raw.map((c) => c.split(";")[0]).join("; ");
}

describe("Custom entities lifecycle (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let portalId: string;
    let slug: string;
    let cookies: string;

    const crm = (method: "get" | "post" | "patch" | "delete", url: string) =>
        request(app.getHttpServer())[method](url).set("Cookie", cookies).set("X-Portal-Slug", slug);

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
        app.use(cookieParser());
        await app.init();

        prisma = app.get(PrismaService);

        slug = `smart-${suffix}`;
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Smart Process Test ${suffix}`,
                email: `owner-smart-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
            });
        expect(res.status).toBe(201);
        portalId = res.body.portal.id as string;
        cookies = extractCookies(res);
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { id: portalId } });
        await prisma.user.deleteMany({
            where: { email: { endsWith: `${suffix}@test.local` } },
        });
        await app.close();
    });

    it("creates a custom entity definition", async () => {
        const res = await crm("post", "/crm/entities").send({
            code: ENTITY_CODE,
            name: "Поставщики",
        });
        expect([200, 201]).toContain(res.status);
        const body = res.body.data ?? res.body;
        expect(body.code).toBe(ENTITY_CODE);
        expect(body.isSystem).toBe(false);
    });

    it("returns 409 for duplicate entity code", async () => {
        const res = await crm("post", "/crm/entities").send({
            code: ENTITY_CODE,
            name: "Дубль",
        });
        expect(res.status).toBe(409);
    });

    it("provisions crm_create form schema with title field", async () => {
        const res = await crm(
            "get",
            `/crm/settings/entities/${ENTITY_CODE}/form-schema/crm_create`
        );
        expect(res.status).toBe(200);
        const schema = res.body.data ?? res.body;
        expect(JSON.stringify(schema)).toContain("title");
    });

    it("provisions crm_detail form schema", async () => {
        const res = await crm(
            "get",
            `/crm/settings/entities/${ENTITY_CODE}/form-schema/crm_detail`
        );
        expect(res.status).toBe(200);
    });

    it("provisions a default funnel with stages", async () => {
        const res = await crm("get", `/crm/settings/entities/${ENTITY_CODE}/stage-categories`);
        expect(res.status).toBe(200);
        const categories = res.body.data ?? res.body;
        expect(categories).toHaveLength(1);
        expect(categories[0].isDefault).toBe(true);
        expect(categories[0].stages.length).toBeGreaterThanOrEqual(3);
    });

    describe("records", () => {
        let recordId: string;

        it("creates a record through the default form", async () => {
            const res = await crm("post", `/crm/entities/${ENTITY_CODE}/records`).send({
                fields: { title: "ООО Ромашка" },
            });
            expect([200, 201]).toContain(res.status);
            const record = res.body.data ?? res.body;
            recordId = record.id;
            expect(recordId).toBeDefined();
        });

        it("lands the record on the default funnel stage", async () => {
            const record = await prisma.entityRecord.findUniqueOrThrow({
                where: { id: recordId },
                select: { stageId: true, portalId: true },
            });
            expect(record.portalId).toBe(portalId);
            expect(record.stageId).not.toBeNull();
        });
    });

    describe("funnels management", () => {
        let categoryId: string;
        let stageIds: string[];

        it("creates a second funnel", async () => {
            const res = await crm(
                "post",
                `/crm/settings/entities/${ENTITY_CODE}/stage-categories`
            ).send({
                code: "sales",
                name: "Продажи",
                stages: [
                    { name: "Лид", sortOrder: 0, semantic: "NEW", color: "#3b82f6" },
                    { name: "Сделка", sortOrder: 1, semantic: "SUCCESS", isTerminalSuccess: true },
                ],
            });
            expect([200, 201]).toContain(res.status);
            const category = res.body.data ?? res.body;
            categoryId = category.id;
            stageIds = category.stages.map((s: { id: string }) => s.id);
            expect(stageIds).toHaveLength(2);
        });

        it("updates funnel name and stages (rename + add + delete)", async () => {
            const res = await crm(
                "patch",
                `/crm/settings/entities/${ENTITY_CODE}/stage-categories/${categoryId}`
            ).send({
                name: "Продажи 2.0",
                stages: [
                    { id: stageIds[0], name: "Новый лид", sortOrder: 0, semantic: "NEW" },
                    { name: "Переговоры", sortOrder: 1, semantic: "IN_PROGRESS" },
                ],
            });
            expect(res.status).toBe(200);
            const category = res.body.data ?? res.body;
            expect(category.name).toBe("Продажи 2.0");
            expect(category.stages).toHaveLength(2);
            const names = category.stages.map((s: { name: string }) => s.name);
            expect(names).toContain("Новый лид");
            expect(names).toContain("Переговоры");
            expect(names).not.toContain("Сделка");
        });

        it("deletes a non-default funnel", async () => {
            const res = await crm(
                "delete",
                `/crm/settings/entities/${ENTITY_CODE}/stage-categories/${categoryId}`
            );
            expect(res.status).toBe(200);
        });

        it("refuses to delete the default funnel", async () => {
            const list = await crm("get", `/crm/settings/entities/${ENTITY_CODE}/stage-categories`);
            const defaultCategory = (list.body.data ?? list.body).find(
                (c: { isDefault: boolean }) => c.isDefault
            );
            const res = await crm(
                "delete",
                `/crm/settings/entities/${ENTITY_CODE}/stage-categories/${defaultCategory.id}`
            );
            expect(res.status).toBe(400);
        });
    });

    describe("status sets management", () => {
        let statusSetId: string;
        let itemId: string;

        it("creates a status set with items", async () => {
            const res = await crm("post", `/crm/settings/entities/${ENTITY_CODE}/status-sets`).send(
                {
                    code: "vendor_status",
                    items: [
                        { key: "active", label: "Активный", color: "#22c55e" },
                        { key: "paused", label: "На паузе", color: "#f59e0b" },
                    ],
                }
            );
            expect([200, 201]).toContain(res.status);
            const set = res.body.data ?? res.body;
            statusSetId = set.id;
            expect(set.items).toHaveLength(2);
        });

        it("adds a status item", async () => {
            const res = await crm(
                "post",
                `/crm/settings/entities/${ENTITY_CODE}/status-sets/${statusSetId}/items`
            ).send({ key: "banned", label: "Заблокирован", color: "#ef4444" });
            expect([200, 201]).toContain(res.status);
            const item = res.body.data ?? res.body;
            itemId = item.id;
            expect(item.key).toBe("banned");
        });

        it("rejects duplicate status key", async () => {
            const res = await crm(
                "post",
                `/crm/settings/entities/${ENTITY_CODE}/status-sets/${statusSetId}/items`
            ).send({ key: "banned", label: "Дубль" });
            expect(res.status).toBe(400);
        });

        it("updates a status item", async () => {
            const res = await crm(
                "patch",
                `/crm/settings/entities/${ENTITY_CODE}/status-sets/${statusSetId}/items/${itemId}`
            ).send({ label: "Бан", isActive: false });
            expect(res.status).toBe(200);
            const item = res.body.data ?? res.body;
            expect(item.label).toBe("Бан");
            expect(item.isActive).toBe(false);
        });

        it("deletes an unused status item", async () => {
            const res = await crm(
                "delete",
                `/crm/settings/entities/${ENTITY_CODE}/status-sets/${statusSetId}/items/${itemId}`
            );
            expect(res.status).toBe(200);
        });
    });
});
