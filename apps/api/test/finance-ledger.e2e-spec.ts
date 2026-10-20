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

type Entry = { id: string; totals: Record<string, number>; [key: string]: unknown };

/**
 * Реестр проводок (TASK-798): статьи пресета, контрагенты с проверкой NIF, суммы и тексты в базе
 * только шифром, дубль документа, обзор и остатки счетов, правка открытого месяца, отмена и сторно
 * закрытого, права finance.read / write / admin, изоляция клубов.
 */
describe("Finance ledger (e2e)", () => {
    let app: INestApplication;
    let fx: ReturnType<typeof financeFixtures>;
    let clubA: Club;
    let clubB: Club;
    let manager: string;
    let memberId: string;
    const categories = new Map<string, string>();

    const entry = async (body: object): Promise<Entry> => {
        const res = await fx.crm(clubA, "post", "/crm/finance/entries").send(body);
        expect(res.status).toBe(201);
        return res.body as Entry;
    };
    const expense = (patch: object = {}) => ({
        direction: "expense",
        occurredOn: today,
        categoryId: categories.get("rent"),
        account: "bank",
        amount: 121,
        description: "Alquiler del local",
        ...patch,
    });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        fx = financeFixtures(app, "led", suffix);

        clubA = await fx.register("a");
        clubB = await fx.register("b");
        await fx.enableFinance(clubA);
        await fx.enableFinance(clubB);
        manager = await fx.seedEmployee(clubA, "manager");
        memberId = await fx.seedMember(clubA);
        const list = await fx.crm(clubA, "get", "/crm/finance/categories");
        for (const c of list.body as { id: string; code: string }[]) categories.set(c.code, c.id);
    });

    afterAll(async () => {
        await fx.cleanup([clubA, clubB]);
        await app.close();
    });

    it("включение финансов создаёт статьи клуба; своя статья — finance.admin; статья заказов в архив не уходит", async () => {
        expect([...categories.keys()]).toEqual(
            expect.arrayContaining(["membership_fees", "sales", "donations", "rent", "salaries"])
        );
        const body = { name: "Seguridad privada", direction: "expense", pgcAccount: "629" };
        expect(
            (await fx.crm(clubA, "post", "/crm/finance/categories", manager).send(body)).status
        ).toBe(403);
        const created = await fx.crm(clubA, "post", "/crm/finance/categories").send(body);
        expect(created.status).toBe(201);
        expect(created.body).toMatchObject({ code: "seguridad_privada", isPreset: false });
        const sales = await fx.crm(
            clubA,
            "delete",
            `/crm/finance/categories/${categories.get("sales")}`
        );
        expect(sales.status).toBe(409);
        expect(sales.body.code).toBe("category_receives_orders");
    });

    it("расход с контрагентом: налог и IRPF, в базе — только шифр; дубль документа — 409 до подтверждения", async () => {
        const party = { kind: "supplier", name: "Gestoría Martínez", nif: "12345678z" };
        const supplier = await fx.crm(clubA, "post", "/crm/finance/counterparties").send(party);
        expect(supplier.status).toBe(201);
        expect(supplier.body.nif).toBe("12345678Z");
        expect(
            (await fx.crm(clubA, "post", "/crm/finance/counterparties").send(party)).body.code
        ).toBe("counterparty_nif_taken");
        const bad = await fx
            .crm(clubA, "post", "/crm/finance/counterparties")
            .send({ ...party, nif: "1234" });
        expect(bad.body.code).toBe("counterparty_nif_invalid");

        const invoice = expense({
            categoryId: categories.get("professional_services"),
            amount: 200,
            amountIncludesTax: false,
            withholdingPercent: 15,
            counterpartyId: supplier.body.id,
            documentType: "invoice_received",
            documentNumber: "2026/45",
            description: "Gestoría mensual",
        });
        const created = await entry(invoice);
        expect(created.totals).toEqual({
            net: 200,
            tax: 42,
            total: 242,
            withholding: 30,
            payable: 212,
        });
        expect(created).toMatchObject({ editable: "full", counterpartyName: "Gestoría Martínez" });

        const row = await fx.prisma.ledgerEntry.findUniqueOrThrow({ where: { id: created.id } });
        expect(row.payload.startsWith("pc1.")).toBe(true);
        for (const secret of ["Gestoría", "2026/45", "242", "212"])
            expect(row.payload).not.toContain(secret);
        const stored = await fx.prisma.counterparty.findUniqueOrThrow({
            where: { id: supplier.body.id },
        });
        expect(stored.details).not.toContain("Martínez");
        expect(stored.details).not.toContain("12345678Z");

        const duplicate = await fx.crm(clubA, "post", "/crm/finance/entries").send(invoice);
        expect(duplicate.status).toBe(409);
        expect(duplicate.body).toMatchObject({ code: "duplicate_document", entryId: created.id });
        await entry({ ...invoice, allowDuplicate: true });
    });

    it("взнос участника вне IVA, перевод касса → банк; обзор месяца и остатки счетов", async () => {
        const fee = await entry({
            direction: "income",
            occurredOn: today,
            categoryId: categories.get("membership_fees"),
            account: "cash",
            amount: 50,
            memberId,
            description: "Cuota mensual",
        });
        expect(fee.lines).toEqual([{ percent: 0, treatment: "not_subject", net: 50, tax: 0 }]);
        expect(fee.counterpartyId).not.toBeNull();
        await entry({
            direction: "transfer",
            occurredOn: today,
            account: "cash",
            toAccount: "bank",
            amount: 30,
            description: "Ingreso",
        });
        const same = await fx.crm(clubA, "post", "/crm/finance/entries").send({
            direction: "transfer",
            occurredOn: today,
            account: "cash",
            toAccount: "cash",
            amount: 1,
            description: "x",
        });
        expect(same.body.code).toBe("transfer_same_account");

        const overview = await fx
            .crm(clubA, "get", "/crm/finance/overview")
            .query({ from: `${today.slice(0, 7)}-01`, to: today });
        expect(overview.status).toBe(200);
        expect(overview.body.income).toMatchObject({ net: 50, count: 1 });
        expect(overview.body.expense).toMatchObject({ net: 400, tax: 84, payable: 424, count: 2 });
        expect(overview.body.result).toBe(-350);
        const balance = Object.fromEntries(
            overview.body.accounts.map((a: { account: string; balance: number }) => [
                a.account,
                a.balance,
            ])
        );
        expect(balance).toEqual({ cash: 20, bank: -394, card: 0 });
    });

    it("правка ручной проводки целиком и разметка; manager читает, но не пишет", async () => {
        const rent = await entry(expense());
        expect(rent.totals).toMatchObject({ net: 100, tax: 21 });
        const put = await fx
            .crm(clubA, "put", `/crm/finance/entries/${rent.id}`)
            .send(expense({ amount: 242 }));
        expect(put.status).toBe(200);
        expect(put.body.totals).toMatchObject({ net: 200, tax: 42, total: 242 });
        const patch = await fx
            .crm(clubA, "patch", `/crm/finance/entries/${rent.id}`)
            .send({ account: "card", notes: "Pagado con tarjeta" });
        expect(patch.body).toMatchObject({ account: "card", notes: "Pagado con tarjeta" });
        const wrong = await fx
            .crm(clubA, "patch", `/crm/finance/entries/${rent.id}`)
            .send({ categoryId: categories.get("donations") });
        expect(wrong.body.code).toBe("category_direction_mismatch");

        expect(
            (await fx.crm(clubA, "get", `/crm/finance/entries/${rent.id}`, manager)).status
        ).toBe(200);
        expect(
            (await fx.crm(clubA, "post", "/crm/finance/entries", manager).send(expense())).status
        ).toBe(403);
        expect(
            (await fx.crm(clubA, "post", `/crm/finance/entries/${rent.id}/cancel`, manager)).status
        ).toBe(403);
    });

    it("клуб B не видит и не трогает проводки, статьи и контрагентов клуба A", async () => {
        const mine = await entry(expense({ description: "Privado" }));
        expect((await fx.crm(clubB, "get", `/crm/finance/entries/${mine.id}`)).status).toBe(404);
        expect(
            (await fx.crm(clubB, "patch", `/crm/finance/entries/${mine.id}`).send({ notes: "x" }))
                .status
        ).toBe(404);
        const list = await fx.crm(clubB, "get", "/crm/finance/entries");
        expect(JSON.stringify(list.body)).not.toContain(mine.id);
        const rentA = categories.get("rent");
        const foreign = await fx
            .crm(clubB, "post", "/crm/finance/entries")
            .send(expense({ categoryId: rentA }));
        expect(foreign.body.code).toBe("category_required");
        const parties = await fx.crm(clubB, "get", "/crm/finance/counterparties");
        expect(JSON.stringify(parties.body)).not.toContain("Martínez");
    });
});
