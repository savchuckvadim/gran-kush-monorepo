import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";

import { AppModule } from "../src/app.module";

import { type Club, financeFixtures } from "./support/finance-club";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).format(new Date());

type Move = {
    reason: string;
    quantity: number;
    unitCost: number;
    balanceAfter: number;
    orderId: string | null;
};

/**
 * Склад и себестоимость (TASK-804): поставка меняет остаток, среднюю себестоимость и пишет расход
 * в учёт одной транзакцией; заказ списывает по средней и помнит её в строке, отмена возвращает;
 * списание требует причину; правка остатка в карточке — движение «пересчёт»; права и чужой клуб.
 */
describe("Stock and cost (e2e)", () => {
    let app: INestApplication;
    let fx: ReturnType<typeof financeFixtures>;
    let club: Club;
    let other: Club;
    let manager: string;
    let employee: string;
    let memberId: string;
    let productId: string;

    const stock = (path: string, cookies?: string) =>
        fx.crm(club, "get", `/crm/stock${path}`, cookies);
    const movesOf = async (): Promise<Move[]> =>
        (await stock(`/moves?productId=${productId}&limit=50`)).body.items as Move[];
    const purchase = (quantity: number, unitCost: number) =>
        fx.crm(club, "post", "/crm/stock/purchases").send({
            productId,
            quantity,
            unitCost,
            receivedOn: today,
        });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        fx = financeFixtures(app, "stk", suffix);
        club = await fx.register("a");
        other = await fx.register("b");
        await fx.enableFinance(club);
        manager = await fx.seedEmployee(club, "manager");
        employee = await fx.seedEmployee(club, "employee");
        memberId = await fx.seedMember(club);
        productId = await fx.newProduct(club, "flower", 12.1);
    });

    afterAll(async () => {
        await fx.cleanup([club, other]);
        await app.close();
    });

    it("поставка без контрагента: остаток, средняя себестоимость и расход в учёте", async () => {
        const first = await purchase(100, 4);
        expect(first.status).toBe(201);
        // товар заведён со 100 шт без цены: первая поставка задаёт цену всему остатку
        expect(first.body.stock).toMatchObject({ currentQuantity: 200, averageCost: 4 });
        expect(first.body.ledgerEntryId).toEqual(expect.any(String));
        const entry = await fx.crm(club, "get", `/crm/finance/entries/${first.body.ledgerEntryId}`);
        expect(entry.body).toMatchObject({
            direction: "expense",
            sourceType: "purchase",
            editable: "classification",
            totals: { net: 400, tax: 84 },
        });
        expect(entry.body.description).toContain("flower");

        // (200 × 4 + 100 × 7) / 300 = 5
        const second = await purchase(100, 7);
        expect(second.body.stock).toMatchObject({
            currentQuantity: 300,
            averageCost: 5,
            stockValue: 1500,
        });
        const state = await stock(`/products/${productId}`, manager);
        expect(state.body).toMatchObject({ averageCost: 5 });
    });

    it("заказ списывает по средней себестоимости и помнит её в строке; отмена возвращает", async () => {
        const order = await fx.crm(club, "post", "/crm/orders").send({
            memberId,
            items: [{ productId, quantity: 2 }],
        });
        expect(order.status).toBe(201);
        expect(order.body.items[0]).toMatchObject({ unitCost: 5 });
        const orderId = order.body.id as string;
        const taken = (await movesOf()).find(
            (move) => move.orderId === orderId && move.reason === "order_placed"
        );
        expect(taken).toMatchObject({ quantity: -2, unitCost: 5, balanceAfter: 298 });

        const record = await fx.prisma.order.findUniqueOrThrow({
            where: { id: orderId },
            select: { entityRecord: { select: { stage: { select: { stageCategoryId: true } } } } },
        });
        const failure = await fx.prisma.stage.findFirstOrThrow({
            where: {
                stageCategoryId: record.entityRecord.stage?.stageCategoryId,
                semantic: "FAILURE",
            },
        });
        const cancelled = await fx
            .crm(club, "patch", `/crm/orders/${orderId}/stage`)
            .send({ stageId: failure.id });
        expect(cancelled.status).toBe(200);
        const returned = (await movesOf()).find(
            (move) => move.orderId === orderId && move.reason === "order_cancelled"
        );
        expect(returned).toMatchObject({ quantity: 2, balanceAfter: 300 });
    });

    it("списание с причиной; без причины и сверх остатка — 400; пересчёт из карточки", async () => {
        const move = (body: object) => fx.crm(club, "post", "/crm/stock/moves").send(body);
        const noNote = await move({ productId, reason: "write_off", quantity: 1, note: " " });
        expect(noNote.body.code).toBe("stock_note_required");
        const tooMuch = await move({ productId, reason: "write_off", quantity: 1000, note: "x" });
        expect(tooMuch.body.code).toBe("stock_insufficient");
        const written = await move({
            productId,
            reason: "write_off",
            quantity: 3,
            note: "Пересохло",
        });
        expect(written.status).toBe(201);
        expect(written.body).toMatchObject({
            reason: "write_off",
            quantity: -3,
            unitCost: 5,
            balanceAfter: 297,
            note: "Пересохло",
        });

        const product = `/crm/catalog/products/${productId}`;
        const recount = await fx
            .crm(club, "patch", product)
            .send({ currentQuantity: 290, stockNote: "Инвентаризация" });
        expect(recount.status).toBe(200);
        expect((await movesOf())[0]).toMatchObject({
            reason: "recount",
            quantity: -7,
            balanceAfter: 290,
        });
        const noReason = await fx.crm(club, "patch", product).send({ currentQuantity: 280 });
        expect(noReason.body.code).toBe("stock_note_required");
    });

    it("маржа периода: оплаченный заказ по средней себестоимости, подарок не считается", async () => {
        const order = await fx.crm(club, "post", "/crm/orders").send({
            memberId,
            items: [
                { productId, quantity: 4 },
                { productId, quantity: 1, isGift: true },
            ],
        });
        expect(order.status).toBe(201);
        const paid = await fx
            .crm(club, "patch", `/crm/orders/${order.body.id}/payment`)
            .send({ paymentStatus: "paid" });
        expect(paid.status).toBe(200);
        const report = await fx
            .crm(club, "get", "/crm/finance/margin")
            .query({ from: today, to: today });
        expect(report.status).toBe(200);
        // 4 × 12,10 € с налогом = 40 € базы; себестоимость 4 × 5 € = 20 €
        const row = report.body.byProduct.find(
            (item: { productId: string }) => item.productId === productId
        );
        expect(row).toMatchObject({
            quantity: 4,
            revenue: 40,
            cost: 20,
            margin: 20,
            marginPercent: 50,
        });
        expect(report.body).toMatchObject({
            revenue: 40,
            cost: 20,
            margin: 20,
            revenueWithoutCost: 0,
        });
        expect(
            (
                await fx
                    .crm(club, "get", "/crm/finance/margin", employee)
                    .query({ from: today, to: today })
            ).status
        ).toBe(403);
    });

    it("права: без catalog.manage нет поставок и списаний; чужой клуб не видит товар", async () => {
        const body = { productId, quantity: 1, unitCost: 1, receivedOn: today };
        const denied = await fx.crm(club, "post", "/crm/stock/purchases", employee).send(body);
        expect(denied.status).toBe(403);
        const gift = { productId, reason: "gift", quantity: 1, note: "x" };
        expect((await fx.crm(club, "post", "/crm/stock/moves", employee).send(gift)).status).toBe(
            403
        );
        expect((await stock("/moves", employee)).status).toBe(200);
        expect((await fx.crm(other, "get", `/crm/stock/products/${productId}`)).status).toBe(404);
        expect((await fx.crm(other, "post", "/crm/stock/purchases").send(body)).status).toBe(404);
        expect((await fx.crm(other, "get", "/crm/stock/purchases")).body.items).toEqual([]);
    });
});
