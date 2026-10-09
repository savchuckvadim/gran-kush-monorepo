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

function extractCookies(res: request.Response): string {
    const setCookie = res.headers["set-cookie"];
    const raw: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    return raw.map((c) => c.split(";")[0]).join("; ");
}

/**
 * RBAC ролей внутри портала для CRM-эндпоинтов каталога, финансов и заказов.
 * Отдельно от cross-portal изоляции (tenant-isolation.e2e-spec.ts).
 */
describe("CRM role-based access (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let portalId: string;
    let slug: string;
    let ownerCookies: string;
    let managerCookies: string;
    let employeeCookies: string;

    let categoryId: string;
    let unitId: string;
    let productId: string;
    let orderId: string;
    let memberId: string;

    const as = (cookies: string) => ({
        get: (url: string) =>
            request(app.getHttpServer()).get(url).set("Cookie", cookies).set("X-Portal-Slug", slug),
        post: (url: string) =>
            request(app.getHttpServer())
                .post(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", slug),
        patch: (url: string) =>
            request(app.getHttpServer())
                .patch(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", slug),
        delete: (url: string) =>
            request(app.getHttpServer())
                .delete(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", slug),
    });

    const seedEmployeeAndLogin = async (role: EmployeeRole): Promise<string> => {
        const employeeDefinition = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "employee" },
            select: { id: true },
        });
        const record = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: employeeDefinition.id },
        });
        const user = await prisma.user.create({
            data: {
                email: `${role}-crm-${suffix}@test.local`,
                passwordHash: await bcrypt.hash(PASSWORD, 10),
                isActive: true,
                emailConfirmed: true,
            },
        });
        await prisma.employee.create({
            data: { userId: user.id, portalId, entityRecordId: record.id, role, isActive: true },
        });

        const res = await request(app.getHttpServer())
            .post("/crm/auth/login")
            .send({ email: user.email, password: PASSWORD });
        expect([200, 201]).toContain(res.status);
        return extractCookies(res);
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();

        prisma = app.get(PrismaService);

        slug = `crmrbac-${suffix}`;
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `CRM RBAC ${suffix}`,
                email: `owner-crmrbac-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
            });
        expect(res.status).toBe(201);
        portalId = res.body.portal.id as string;
        ownerCookies = extractCookies(res);

        managerCookies = await seedEmployeeAndLogin(EmployeeRole.manager);
        employeeCookies = await seedEmployeeAndLogin(EmployeeRole.employee);

        // Каталог: юнит + категория + товар (сидим напрямую, чтобы тесты не зависели от прав на создание)
        const unit = await prisma.measurementUnit.create({
            data: {
                portalId: portalId,
                code: `rbac-unit-${suffix}`,
                name: "RBAC Unit",
                isCustom: true,
            },
        });
        unitId = unit.id;

        const category = await prisma.productCategory.create({
            data: { portalId, code: `rbac-cat-${suffix}`, name: "RBAC Category" },
        });
        categoryId = category.id;

        const productDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "product" },
            select: { id: true },
        });
        const productRecord = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: productDef.id },
        });
        const product = await prisma.product.create({
            data: {
                portalId,
                entityRecordId: productRecord.id,
                categoryId,
                measurementUnitId: unitId,
                name: `RBAC Product ${suffix}`,
                price: 10,
                initialQuantity: 100,
                currentQuantity: 100,
            },
        });
        productId = product.id;

        // Участник + заказ
        const memberDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "member" },
            select: { id: true },
        });
        const memberRecord = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: memberDef.id },
        });
        const memberUser = await prisma.user.create({
            data: {
                email: `member-crmrbac-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });
        const member = await prisma.member.create({
            data: {
                userId: memberUser.id,
                portalId,
                entityRecordId: memberRecord.id,
                isActive: true,
            },
        });
        memberId = member.id;

        const orderDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "order" },
            select: { id: true },
        });
        const orderRecord = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: orderDef.id },
        });
        const order = await prisma.order.create({
            data: {
                portalId,
                entityRecordId: orderRecord.id,
                memberId,
                orderNumber: `RBAC-${suffix}`,
                subtotal: 10,
                total: 10,
            },
        });
        orderId = order.id;
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { id: portalId } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        if (unitId) {
            await prisma.measurementUnit.deleteMany({ where: { id: unitId } });
        }
        await app.close();
    });

    describe("catalog — write только для admin", () => {
        it("allows employee role to read products", async () => {
            const res = await as(employeeCookies).get("/crm/catalog/products");
            expect(res.status).toBe(200);
        });

        it("rejects product creation by employee role", async () => {
            const res = await as(employeeCookies).post("/crm/catalog/products").send({
                name: "Левый товар",
                categoryId,
                measurementUnitId: unitId,
                price: 1,
                initialQuantity: 1,
            });
            expect(res.status).toBe(403);
        });

        it("rejects product update by employee role", async () => {
            const res = await as(employeeCookies)
                .patch(`/crm/catalog/products/${productId}`)
                .send({ price: 1 });
            expect(res.status).toBe(403);
        });

        it("rejects product deletion by employee role", async () => {
            const res = await as(employeeCookies).delete(`/crm/catalog/products/${productId}`);
            expect(res.status).toBe(403);
        });

        it("rejects category creation by employee role", async () => {
            const res = await as(employeeCookies)
                .post("/crm/catalog/categories")
                .send({ code: `hack-cat-${suffix}`, name: "Левая категория" });
            expect(res.status).toBe(403);
        });

        it("rejects measurement unit creation by employee role", async () => {
            const res = await as(employeeCookies)
                .post("/crm/catalog/measurement-units")
                .send({ code: `hack-unit-${suffix}`, name: "Левый юнит" });
            expect(res.status).toBe(403);
        });

        it("allows measurement unit creation by portal owner", async () => {
            const res = await as(ownerCookies)
                .post("/crm/catalog/measurement-units")
                .send({ code: `own-unit-${suffix}`, name: "Своя единица" });
            expect(res.status).toBe(201);

            // Единица заводится в своём портале, а не в общей таблице.
            const created = await prisma.measurementUnit.findFirst({
                where: { code: `own-unit-${suffix}` },
                select: { portalId: true },
            });
            expect(created?.portalId).toBe(portalId);
        });

        it("rejects product update by manager role (admin only)", async () => {
            const res = await as(managerCookies)
                .patch(`/crm/catalog/products/${productId}`)
                .send({ price: 2 });
            expect(res.status).toBe(403);
        });

        it("allows product update by portal owner", async () => {
            const res = await as(ownerCookies)
                .patch(`/crm/catalog/products/${productId}`)
                .send({ price: 42 });
            expect(res.status).toBe(200);
        });
    });

    describe("finance — ручные транзакции только для admin", () => {
        it("rejects manual transaction by employee role", async () => {
            const res = await as(employeeCookies).post("/crm/finance/transactions").send({
                type: "income",
                amount: 1000,
                description: "Левая транзакция",
            });
            expect(res.status).toBe(403);
        });

        it("rejects manual transaction by manager role", async () => {
            const res = await as(managerCookies).post("/crm/finance/transactions").send({
                type: "income",
                amount: 1000,
                description: "Левая транзакция",
            });
            expect(res.status).toBe(403);
        });
    });

    describe("orders — смена статуса и оплаты от manager", () => {
        it("allows employee role to read orders", async () => {
            const res = await as(employeeCookies).get("/crm/orders");
            expect(res.status).toBe(200);
        });

        it("rejects order status change by employee role", async () => {
            const res = await as(employeeCookies)
                .patch(`/crm/orders/${orderId}/status`)
                .send({ status: "confirmed" });
            expect(res.status).toBe(403);
        });

        it("rejects payment status change by employee role", async () => {
            const res = await as(employeeCookies)
                .patch(`/crm/orders/${orderId}/payment`)
                .send({ paymentStatus: "paid" });
            expect(res.status).toBe(403);
        });

        it("allows order status change by manager", async () => {
            const res = await as(managerCookies)
                .patch(`/crm/orders/${orderId}/status`)
                .send({ status: "confirmed" });
            expect(res.status).toBe(200);
        });
    });
});
