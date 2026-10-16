import { BadRequestException, INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { MemberAuthService } from "../src/modules/portal/auth/members/application/services/member-auth.service";
import { OrdersService } from "../src/modules/portal/crm/orders/application/services/orders.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

type Stage = { id: string; name: string };
type Funnel = { isDefault: boolean; stages: Stage[] };

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Склад и заказы (TASK-677): заказ и списание — одна транзакция, остаток проверяет само
 * списание. Параллельные заказы не продают больше, чем есть; нехватка одной позиции не
 * оставляет ни заказа, ни списания; отмена возвращает товар, и распроданный снова доступен.
 */
describe("Order stock (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let orders: OrdersService;

    const slug = `stock-${suffix}`;
    let portalId: string;
    let cookies: string;
    let memberCookies: string;
    let memberId: string;
    let unitId: string;
    let categoryId: string;
    let productDefId: string;

    const createProduct = async (id: string, name: string, stock: number): Promise<string> => {
        const record = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: productDefId },
        });
        const product = await prisma.product.create({
            data: {
                id,
                portalId,
                entityRecordId: record.id,
                categoryId,
                measurementUnitId: unitId,
                name,
                price: 10,
                initialQuantity: stock,
                currentQuantity: stock,
            },
        });
        return product.id;
    };

    const stockOf = async (productId: string) => {
        const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
        return { quantity: Number(product.currentQuantity), isAvailable: product.isAvailable };
    };

    const orderOne = (productId: string, quantity = 1) =>
        orders.createOrder(memberId, { items: [{ productId, quantity }] }, portalId);

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);
        orders = app.get(OrdersService);

        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Stock ${suffix}`,
                email: `owner-stock-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        portalId = res.body.portal.id as string;
        cookies = cookieHeader(res);

        unitId = (
            await prisma.measurementUnit.create({
                data: { portalId, code: `stk-unit-${suffix}`, name: "Gram", isCustom: true },
            })
        ).id;
        categoryId = (
            await prisma.productCategory.create({
                data: { portalId, code: `stk-cat-${suffix}`, name: "Flowers" },
            })
        ).id;
        productDefId = (
            await prisma.entityDefinition.findFirstOrThrow({
                where: { portalId, code: "product" },
                select: { id: true },
            })
        ).id;

        const memberDef = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId, code: "member" },
            select: { id: true },
        });
        const memberRecord = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: memberDef.id },
        });
        const user = await prisma.user.create({
            data: {
                email: `member-stock-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });
        memberId = (
            await prisma.member.create({
                data: {
                    userId: user.id,
                    portalId,
                    entityRecordId: memberRecord.id,
                    isActive: true,
                },
            })
        ).id;
        const memberTokens = await app
            .get(MemberAuthService)
            .generateTokens({ id: user.id, email: user.email }, `device-stock-${suffix}`);
        memberCookies = `member_access_token=${memberTokens.accessToken}`;
    });

    afterAll(async () => {
        // order items hold products without cascade: orders first, then the portal
        await prisma.order.deleteMany({ where: { portalId } });
        await prisma.portal.deleteMany({ where: { id: portalId } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("parallel orders never sell more than the stock", async () => {
        const productId = await createProduct(`race-${suffix}`, `Race ${suffix}`, 3);

        const results = await Promise.allSettled(
            Array.from({ length: 6 }, () => orderOne(productId))
        );

        const placed = results.filter((r) => r.status === "fulfilled");
        const refused = results.filter((r) => r.status === "rejected");
        expect(placed).toHaveLength(3);
        expect(refused).toHaveLength(3);
        for (const result of refused) {
            expect(result.reason).toBeInstanceOf(BadRequestException);
        }
        expect(await stockOf(productId)).toEqual({ quantity: 0, isAvailable: false });
        expect(await prisma.orderItem.count({ where: { productId, order: { portalId } } })).toBe(3);
    });

    it("an order whose last line has run out writes nothing", async () => {
        // ids order the lines: the plentiful product is reserved first, then the scarce one fails
        const plentiful = await createProduct(`aaaa-${suffix}`, `Plenty ${suffix}`, 5);
        const scarce = await createProduct(`zzzz-${suffix}`, `Scarce ${suffix}`, 1);
        const ordersBefore = await prisma.order.count({ where: { portalId } });

        // two lines of the scarce product pass the per-line check, together they need 2
        const attempt = orders.createOrder(
            memberId,
            {
                items: [
                    { productId: plentiful, quantity: 1 },
                    { productId: scarce, quantity: 1 },
                    { productId: scarce, quantity: 1 },
                ],
            },
            portalId
        );

        await expect(attempt).rejects.toThrow(`Недостаточно товара "Scarce ${suffix}"`);
        expect(await stockOf(plentiful)).toEqual({ quantity: 5, isAvailable: true });
        expect(await stockOf(scarce)).toEqual({ quantity: 1, isAvailable: true });
        expect(await prisma.order.count({ where: { portalId } })).toBe(ordersBefore);
    });

    it("cancelling puts the goods back and a sold-out product is available again", async () => {
        const productId = await createProduct(`back-${suffix}`, `Back ${suffix}`, 1);
        const order = await orderOne(productId);
        expect(await stockOf(productId)).toEqual({ quantity: 0, isAvailable: false });

        const funnels = await request(app.getHttpServer())
            .get("/crm/settings/entities/order/stage-categories")
            .set("Cookie", cookies)
            .set("X-Portal-Slug", slug)
            .set("Accept-Language", "en");
        const cancelled = (funnels.body as Funnel[])
            .find((f) => f.isDefault)
            ?.stages.find((s) => s.name === "Cancelled");
        if (!cancelled) throw new Error("Cancelled stage missing");

        const res = await request(app.getHttpServer())
            .patch(`/crm/orders/${order.id}/stage`)
            .set("Cookie", cookies)
            .set("X-Portal-Slug", slug)
            .send({ stageId: cancelled.id });

        expect(res.status).toBe(200);
        expect(await stockOf(productId)).toEqual({ quantity: 1, isAvailable: true });
    });

    it("an employee order: own price and a gift line, both written off the stock", async () => {
        const productId = await createProduct(randomUUID(), `Crm ${suffix}`, 5);

        const res = await request(app.getHttpServer())
            .post("/crm/orders")
            .set("Cookie", cookies)
            .set("X-Portal-Slug", slug)
            .send({
                memberId,
                items: [
                    { productId, quantity: 2, unitPrice: 7.5 },
                    { productId, quantity: 1, isGift: true },
                ],
                notes: "walk-in",
            });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ subtotal: 15, total: 15, notes: "walk-in" });
        expect(res.body.employee).not.toBeNull();
        expect(res.body.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ unitPrice: 7.5, totalPrice: 15, isGift: false }),
                expect.objectContaining({ unitPrice: 10, totalPrice: 0, isGift: true }),
            ])
        );
        expect(await stockOf(productId)).toEqual({ quantity: 2, isAvailable: true });
    });

    it("an employee order for a member of no club is refused", async () => {
        const productId = await createProduct(randomUUID(), `Ghost ${suffix}`, 5);

        const res = await request(app.getHttpServer())
            .post("/crm/orders")
            .set("Cookie", cookies)
            .set("X-Portal-Slug", slug)
            .send({
                memberId: "00000000-0000-4000-8000-000000000000",
                items: [{ productId, quantity: 1 }],
            });

        expect(res.status).toBe(404);
        expect(await stockOf(productId)).toEqual({ quantity: 5, isAvailable: true });
    });

    it("a member cannot set their own price or a gift from the cabinet", async () => {
        const productId = await createProduct(randomUUID(), `Lk ${suffix}`, 5);

        const res = await request(app.getHttpServer())
            .post("/cabinet/orders")
            .set("Cookie", memberCookies)
            .set("X-Portal-Slug", slug)
            .send({ items: [{ productId, quantity: 1, unitPrice: 0, isGift: true }] });

        expect(res.status).toBe(400);
        expect(await stockOf(productId)).toEqual({ quantity: 5, isAvailable: true });
    });
});
