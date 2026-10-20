import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import type { DomainEvent } from "@workspace/domain-events";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";

import { AppModule } from "../src/app.module";
import { SYSTEM_ACTOR } from "../src/modules/events";
import { OrderLedgerConsumer } from "../src/modules/portal/crm/finance/application/order-ledger.consumer";
import { ReconcileOrderSaleUseCase } from "../src/modules/portal/crm/finance/application/use-cases/reconcile-order-sale.use-case";

import { type Club, financeFixtures } from "./support/finance-club";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const POLL_MS = 200;
const POLL_TRIES = 75;

type Entry = {
    id: string;
    orderId: string | null;
    reversalOfId: string | null;
    sourceType: string;
    lines: { percent: number; net: number; tax: number }[];
    totals: Record<string, number>;
    [key: string]: unknown;
};

/**
 * Автопроводки заказов (TASK-798): оплата — доход по статье продаж со строками налога заказа и
 * участником-контрагентом; повтор события не дублирует; возврат и отмена — сторно; суммы ведёт
 * заказ, в учёте меняется только разметка; клуб без финансов проводок не получает.
 */
describe("Finance ledger from orders (e2e)", () => {
    let app: INestApplication;
    let fx: ReturnType<typeof financeFixtures>;
    let clubA: Club;
    let clubB: Club;
    let memberId: string;
    let included: string;
    let reduced: string;
    let salesId: string;

    const orderEntries = async (orderId: string): Promise<Entry[]> => {
        const res = await fx.crm(clubA, "get", "/crm/finance/entries").query({ limit: 100 });
        const all = res.body.items as Entry[];
        const ids = new Set(all.filter((entry) => entry.orderId === orderId).map((e) => e.id));
        return all.filter(
            (entry) => ids.has(entry.id) || (entry.reversalOfId && ids.has(entry.reversalOfId))
        );
    };
    /** Проводки появляются через outbox и очередь — ждём нужное число. */
    const eventually = async (orderId: string, count: number): Promise<Entry[]> => {
        for (let i = 0; i < POLL_TRIES; i++) {
            const entries = await orderEntries(orderId);
            if (entries.length === count) return entries;
            await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        }
        throw new Error(`order ${orderId} did not reach ${count} ledger entries`);
    };
    const placePaidOrder = async (club: Club, member: string): Promise<string> => {
        const order = await fx.crm(club, "post", "/crm/orders").send({
            memberId: member,
            items: [
                { productId: included, quantity: 2 },
                { productId: reduced, quantity: 1 },
            ],
        });
        expect(order.status).toBe(201);
        const paid = await fx
            .crm(club, "patch", `/crm/orders/${order.body.id}/payment`)
            .send({ paymentStatus: "paid" });
        expect(paid.status).toBe(200);
        return order.body.id as string;
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        fx = financeFixtures(app, "ord", suffix);
        clubA = await fx.register("a");
        clubB = await fx.register("b");
        await fx.enableFinance(clubA);
        memberId = await fx.seedMember(clubA);
        included = await fx.newProduct(clubA, "included", 12.1);
        reduced = await fx.newProduct(clubA, "reduced", 11);
        const rates = await fx.crm(clubA, "get", "/crm/finance/tax-rates");
        const reducedRate = (rates.body as { id: string; presetCode: string }[]).find(
            (rate) => rate.presetCode === "es_reduced"
        );
        await fx
            .crm(clubA, "patch", `/crm/catalog/products/${reduced}`)
            .send({ taxRateId: reducedRate?.id });
        const categories = await fx.crm(clubA, "get", "/crm/finance/categories");
        salesId = (categories.body as { id: string; code: string }[]).find(
            (category) => category.code === "sales"
        )!.id;
    });

    afterAll(async () => {
        await fx.cleanup([clubA, clubB]);
        await app.close();
    });

    it("оплата заказа — доход по статье продаж: строки по ставкам, участник, номер заказа", async () => {
        const orderId = await placePaidOrder(clubA, memberId);
        const [sale] = await eventually(orderId, 1);
        expect(sale).toMatchObject({
            direction: "income",
            categoryId: salesId,
            account: "cash",
            sourceType: "order_sale",
            orderId,
            editable: "classification",
            sourceLabel: expect.any(String),
        });
        expect(sale.lines).toEqual([
            { percent: 21, treatment: "taxable", net: 20, tax: 4.2 },
            { percent: 10, treatment: "taxable", net: 10, tax: 1 },
        ]);
        expect(sale.totals).toMatchObject({ net: 30, tax: 5.2, total: 35.2, payable: 35.2 });
        expect(sale.counterpartyId).not.toBeNull();

        const reconcile = app.get(ReconcileOrderSaleUseCase);
        await reconcile.execute(clubA.portalId, orderId, new Date(), SYSTEM_ACTOR);
        await reconcile.execute(clubA.portalId, orderId, new Date(), SYSTEM_ACTOR);
        expect(await orderEntries(orderId)).toHaveLength(1);

        const entryPath = `/crm/finance/entries/${sale.id}`;
        const card = await fx.crm(clubA, "patch", entryPath).send({ account: "card" });
        expect(card.body.account).toBe("card");
        const put = await fx.crm(clubA, "put", entryPath).send({
            direction: "income",
            occurredOn: "2026-10-01",
            categoryId: salesId,
            account: "cash",
            amount: 1,
            description: "x",
        });
        expect(put.body.code).toBe("entry_managed_by_source");
        const cancel = await fx.crm(clubA, "post", `${entryPath}/cancel`);
        expect(cancel.body.code).toBe("entry_managed_by_source");

        const refunded = await fx
            .crm(clubA, "patch", `/crm/orders/${orderId}/payment`)
            .send({ paymentStatus: "refunded" });
        expect(refunded.status).toBe(200);
        const entries = await eventually(orderId, 2);
        const reversal = entries.find((entry) => entry.reversalOfId === sale.id);
        expect(reversal).toMatchObject({ sourceType: "reversal", account: "card" });
        expect(reversal?.totals).toMatchObject({ net: -30, tax: -5.2, total: -35.2 });
    });

    it("отмена оплаченного заказа сторнирует продажу", async () => {
        const orderId = await placePaidOrder(clubA, memberId);
        const [sale] = await eventually(orderId, 1);
        const order = await fx.prisma.order.findUniqueOrThrow({
            where: { id: orderId },
            select: { entityRecord: { select: { stage: { select: { stageCategoryId: true } } } } },
        });
        const failure = await fx.prisma.stage.findFirstOrThrow({
            where: {
                stageCategoryId: order.entityRecord.stage?.stageCategoryId,
                semantic: "FAILURE",
            },
        });
        const cancelled = await fx
            .crm(clubA, "patch", `/crm/orders/${orderId}/stage`)
            .send({ stageId: failure.id });
        expect(cancelled.status).toBe(200);
        const entries = await eventually(orderId, 2);
        const reversal = entries.find((entry) => entry.reversalOfId === sale.id);
        expect(reversal?.totals.total).toBe(-35.2);
    });

    it("клуб без финансов не получает проводок по оплате", async () => {
        const event = {
            id: randomUUID(),
            name: "order.payment_changed",
            version: 1,
            portalId: clubB.portalId,
            occurredAt: new Date().toISOString(),
            actor: SYSTEM_ACTOR,
            aggregate: { kind: "order", id: randomUUID() },
            payload: {
                orderId: randomUUID(),
                orderNumber: "X-1",
                memberId: randomUUID(),
                from: "pending",
                to: "paid",
                employeeId: null,
            },
        } satisfies DomainEvent<"order.payment_changed">;
        await app.get(OrderLedgerConsumer).onOrderEvent(event);
        const count = await fx.prisma.ledgerEntry.count({ where: { portalId: clubB.portalId } });
        expect(count).toBe(0);
        const res = await fx.crm(clubB, "get", "/crm/finance/entries");
        expect(res.body.code).toBe("module_disabled");
    });
});
