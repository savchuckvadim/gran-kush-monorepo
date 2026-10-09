import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { EmployeeRole } from "@prisma/client";
import bcrypt from "bcrypt";
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

describe("Entity records RBAC + isolation (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let portalId: string;
    let slug: string;
    let ownerCookies: string;
    let managerCookies: string;
    let employeeCookies: string;

    // Второй портал — для проверки изоляции записей
    let otherPortalId: string;
    let otherSlug: string;
    let otherOwnerCookies: string;
    let foreignRecordId: string;

    let recordId: string;
    let statusItemId: string;
    let stageId: string;

    const as = (cookies: string, portalSlug: string) => ({
        get: (url: string) =>
            request(app.getHttpServer())
                .get(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", portalSlug),
        post: (url: string) =>
            request(app.getHttpServer())
                .post(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", portalSlug),
        patch: (url: string) =>
            request(app.getHttpServer())
                .patch(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", portalSlug),
        delete: (url: string) =>
            request(app.getHttpServer())
                .delete(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", portalSlug),
    });

    /** Заводит сотрудника с нужной ролью напрямую в БД и логинит его. */
    const seedEmployeeAndLogin = async (
        targetPortalId: string,
        role: EmployeeRole
    ): Promise<string> => {
        const employeeDefinition = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId: targetPortalId, code: "employee" },
            select: { id: true },
        });
        const record = await prisma.entityRecord.create({
            data: { portalId: targetPortalId, entityDefinitionId: employeeDefinition.id },
        });
        const user = await prisma.user.create({
            data: {
                email: `${role}-${suffix}@test.local`,
                passwordHash: await bcrypt.hash(PASSWORD, 10),
                isActive: true,
                emailConfirmed: true,
            },
        });
        await prisma.employee.create({
            data: {
                userId: user.id,
                portalId: targetPortalId,
                entityRecordId: record.id,
                role,
                isActive: true,
            },
        });

        const res = await request(app.getHttpServer())
            .post("/crm/auth/login")
            .send({ email: user.email, password: PASSWORD });
        expect([200, 201]).toContain(res.status);
        return extractCookies(res);
    };

    const registerPortal = async (
        portalSlug: string,
        email: string
    ): Promise<{ id: string; cookies: string }> => {
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: portalSlug,
                displayName: `RBAC Test ${portalSlug}`,
                email,
                password: PASSWORD,
                ownerName: "Owner",
            });
        expect(res.status).toBe(201);
        return { id: res.body.portal.id as string, cookies: extractCookies(res) };
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();

        prisma = app.get(PrismaService);

        slug = `rbac-${suffix}`;
        const owner = await registerPortal(slug, `owner-rbac-${suffix}@test.local`);
        portalId = owner.id;
        ownerCookies = owner.cookies;

        otherSlug = `rbac-other-${suffix}`;
        const otherOwner = await registerPortal(otherSlug, `owner-other-${suffix}@test.local`);
        otherPortalId = otherOwner.id;
        otherOwnerCookies = otherOwner.cookies;

        managerCookies = await seedEmployeeAndLogin(portalId, EmployeeRole.manager);
        employeeCookies = await seedEmployeeAndLogin(portalId, EmployeeRole.employee);

        // Кастомная сущность + запись в каждом портале (portal_owner имеет все права)
        for (const [pid, cookies, portalSlug] of [
            [portalId, ownerCookies, slug],
            [otherPortalId, otherOwnerCookies, otherSlug],
        ] as const) {
            const created = await as(cookies, portalSlug)
                .post("/crm/entities")
                .send({ code: ENTITY_CODE, name: "Поставщики" });
            expect([200, 201]).toContain(created.status);

            const record = await as(cookies, portalSlug)
                .post(`/crm/entities/${ENTITY_CODE}/records`)
                .send({ fields: { title: `Запись ${pid}` } });
            expect([200, 201]).toContain(record.status);
            const body = record.body.data ?? record.body;
            if (pid === portalId) {
                recordId = body.id;
            } else {
                foreignRecordId = body.id;
            }
        }

        const statusSet = await as(ownerCookies, slug)
            .post(`/crm/settings/entities/${ENTITY_CODE}/status-sets`)
            .send({
                code: "vendor_status",
                items: [{ key: "active", label: "Активный", color: "#22c55e" }],
            });
        expect([200, 201]).toContain(statusSet.status);
        statusItemId = (statusSet.body.data ?? statusSet.body).items[0].id;

        const categories = await as(ownerCookies, slug).get(
            `/crm/settings/entities/${ENTITY_CODE}/stage-categories`
        );
        stageId = (categories.body.data ?? categories.body)[0].stages[0].id;
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({
            where: { id: { in: [portalId, otherPortalId].filter(Boolean) } },
        });
        await prisma.user.deleteMany({
            where: { email: { endsWith: `${suffix}@test.local` } },
        });
        await app.close();
    });

    describe("read access — любой сотрудник портала", () => {
        it("allows employee role to list records", async () => {
            const res = await as(employeeCookies, slug).get(`/crm/entities/${ENTITY_CODE}/records`);
            expect(res.status).toBe(200);
        });

        it("allows employee role to read a record by id", async () => {
            const res = await as(employeeCookies, slug).get(
                `/crm/entities/${ENTITY_CODE}/records/${recordId}`
            );
            expect(res.status).toBe(200);
        });
    });

    describe("write access — роль employee запрещена", () => {
        it("rejects record creation by employee role", async () => {
            const res = await as(employeeCookies, slug)
                .post(`/crm/entities/${ENTITY_CODE}/records`)
                .send({ fields: { title: "Не должно создаться" } });
            expect(res.status).toBe(403);
        });

        it("rejects record update by employee role", async () => {
            const res = await as(employeeCookies, slug)
                .patch(`/crm/entities/${ENTITY_CODE}/records/${recordId}`)
                .send({ fields: { title: "Взлом" } });
            expect(res.status).toBe(403);
        });

        it("rejects stage change by employee role", async () => {
            const res = await as(employeeCookies, slug)
                .patch(`/crm/entities/${ENTITY_CODE}/records/${recordId}/stage`)
                .send({ stageId });
            expect(res.status).toBe(403);
        });

        it("rejects status change by employee role", async () => {
            const res = await as(employeeCookies, slug)
                .patch(`/crm/entities/${ENTITY_CODE}/records/${recordId}/status`)
                .send({ statusItemId });
            expect(res.status).toBe(403);
        });

        it("rejects record deletion by employee role", async () => {
            const res = await as(employeeCookies, slug).delete(
                `/crm/entities/${ENTITY_CODE}/records/${recordId}`
            );
            expect(res.status).toBe(403);
        });
    });

    describe("write access — роль manager", () => {
        let managerRecordId: string;

        it("allows record creation by manager", async () => {
            const res = await as(managerCookies, slug)
                .post(`/crm/entities/${ENTITY_CODE}/records`)
                .send({ fields: { title: "Создано менеджером" } });
            expect([200, 201]).toContain(res.status);
            managerRecordId = (res.body.data ?? res.body).id;
        });

        it("allows record update by manager", async () => {
            const res = await as(managerCookies, slug)
                .patch(`/crm/entities/${ENTITY_CODE}/records/${managerRecordId}`)
                .send({ fields: { title: "Обновлено менеджером" } });
            expect(res.status).toBe(200);
        });

        it("allows stage change by manager", async () => {
            const res = await as(managerCookies, slug)
                .patch(`/crm/entities/${ENTITY_CODE}/records/${managerRecordId}/stage`)
                .send({ stageId });
            expect(res.status).toBe(200);
        });

        it("rejects record deletion by manager (admin only)", async () => {
            const res = await as(managerCookies, slug).delete(
                `/crm/entities/${ENTITY_CODE}/records/${managerRecordId}`
            );
            expect(res.status).toBe(403);
        });

        it("allows record deletion by portal owner", async () => {
            const res = await as(ownerCookies, slug).delete(
                `/crm/entities/${ENTITY_CODE}/records/${managerRecordId}`
            );
            expect(res.status).toBe(200);
        });
    });

    describe("cross-portal isolation of entity records", () => {
        it("does not list foreign portal records", async () => {
            const res = await as(ownerCookies, slug).get(`/crm/entities/${ENTITY_CODE}/records`);
            expect(res.status).toBe(200);
            expect(JSON.stringify(res.body)).not.toContain(foreignRecordId);
        });

        it("returns 404 for foreign portal record by id", async () => {
            const res = await as(ownerCookies, slug).get(
                `/crm/entities/${ENTITY_CODE}/records/${foreignRecordId}`
            );
            expect(res.status).toBe(404);
        });

        it("rejects update of foreign portal record", async () => {
            const res = await as(ownerCookies, slug)
                .patch(`/crm/entities/${ENTITY_CODE}/records/${foreignRecordId}`)
                .send({ fields: { title: "Hijacked" } });
            expect(res.status).toBe(404);
        });

        it("rejects deletion of foreign portal record", async () => {
            const res = await as(ownerCookies, slug).delete(
                `/crm/entities/${ENTITY_CODE}/records/${foreignRecordId}`
            );
            expect(res.status).toBe(404);
        });

        it("keeps the foreign record intact", async () => {
            const record = await prisma.entityRecord.findUnique({
                where: { id: foreignRecordId },
                select: { portalId: true },
            });
            expect(record?.portalId).toBe(otherPortalId);
        });
    });
});
