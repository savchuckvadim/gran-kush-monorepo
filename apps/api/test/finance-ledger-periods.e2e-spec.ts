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
const [year, month] = today.split("-").map(Number);
const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
const previousDay = `${previous.year}-${String(previous.month).padStart(2, "0")}-15`;

type Entry = { id: string; totals: Record<string, number>; [key: string]: unknown };

/**
 * Месяцы учёта (TASK-798): закрыть можно только прошедший месяц и только finance.admin; закрытый
 * месяц не принимает и не меняет проводки, отмена в нём — сторно сегодняшним числом; в открытом —
 * отмена выводит проводку из итогов; закрытый месяц открывается снова.
 */
describe("Finance periods (e2e)", () => {
    let app: INestApplication;
    let fx: ReturnType<typeof financeFixtures>;
    let clubA: Club;
    let manager: string;
    let rentId: string;

    const entry = async (body: object): Promise<Entry> => {
        const res = await fx.crm(clubA, "post", "/crm/finance/entries").send(body);
        expect(res.status).toBe(201);
        return res.body as Entry;
    };
    const expense = (patch: object = {}) => ({
        direction: "expense",
        occurredOn: today,
        categoryId: rentId,
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
        fx = financeFixtures(app, "per", suffix);
        clubA = await fx.register("a");
        await fx.enableFinance(clubA);
        manager = await fx.seedEmployee(clubA, "manager");
        const list = await fx.crm(clubA, "get", "/crm/finance/categories");
        rentId = (list.body as { id: string; code: string }[]).find((c) => c.code === "rent")!.id;
    });

    afterAll(async () => {
        await fx.cleanup([clubA]);
        await app.close();
    });

    it("закрытый месяц: запись и правка — 409, отмена — сторно сегодня; открытый — отмена", async () => {
        const old = await entry(expense({ occurredOn: previousDay, description: "Luz" }));
        const close = (cookies?: string) =>
            fx.crm(
                clubA,
                "post",
                `/crm/finance/periods/${previous.year}/${previous.month}/close`,
                cookies
            );
        expect((await close(manager)).status).toBe(403);
        expect((await close()).status).toBe(204);
        expect((await close()).body.code).toBe("period_already_closed");
        const current = await fx.crm(clubA, "post", `/crm/finance/periods/${year}/${month}/close`);
        expect(current.body.code).toBe("period_not_past");

        const late = await fx
            .crm(clubA, "post", "/crm/finance/entries")
            .send(expense({ occurredOn: previousDay }));
        expect(late.status).toBe(409);
        expect(late.body).toMatchObject({ code: "period_closed" });
        const edit = await fx
            .crm(clubA, "put", `/crm/finance/entries/${old.id}`)
            .send(expense({ occurredOn: today }));
        expect(edit.body.code).toBe("period_closed");

        const reversed = await fx.crm(clubA, "post", `/crm/finance/entries/${old.id}/cancel`);
        expect(reversed.status).toBe(201);
        expect(reversed.body.mode).toBe("reversed");
        expect(reversed.body.entry).toMatchObject({
            reversalOfId: old.id,
            occurredOn: today,
            sourceType: "reversal",
        });
        expect(reversed.body.entry.totals).toMatchObject({ net: -100, tax: -21 });
        expect(
            (await fx.crm(clubA, "post", `/crm/finance/entries/${old.id}/cancel`)).body.code
        ).toBe("entry_already_reversed");
        const stornoOfStorno = await fx.crm(
            clubA,
            "post",
            `/crm/finance/entries/${reversed.body.entry.id}/cancel`
        );
        expect(stornoOfStorno.body.code).toBe("entry_managed_by_source");

        const fresh = await entry(expense({ description: "Error" }));
        const voided = await fx.crm(clubA, "post", `/crm/finance/entries/${fresh.id}/cancel`);
        expect(voided.body).toMatchObject({
            mode: "voided",
            entry: { status: "void", editable: "none" },
        });
        const listed = await fx.crm(clubA, "get", "/crm/finance/entries").query({ limit: 100 });
        expect(listed.body.items.some((e: Entry) => e.id === fresh.id)).toBe(false);
        const withVoid = await fx
            .crm(clubA, "get", "/crm/finance/entries")
            .query({ limit: 100, includeVoid: true });
        expect(withVoid.body.items.some((e: Entry) => e.id === fresh.id)).toBe(true);

        const periods = await fx.crm(clubA, "get", "/crm/finance/periods");
        expect(periods.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    year: previous.year,
                    month: previous.month,
                    closable: false,
                    closedByName: expect.any(String),
                }),
            ])
        );
        const reopen = () =>
            fx.crm(clubA, "post", `/crm/finance/periods/${previous.year}/${previous.month}/reopen`);
        expect((await reopen()).status).toBe(204);
        expect((await reopen()).body.code).toBe("period_not_closed");
    });
});
