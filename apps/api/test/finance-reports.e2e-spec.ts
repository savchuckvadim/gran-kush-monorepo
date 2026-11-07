import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";

import { AppModule } from "../src/app.module";
import { StorageService } from "../src/modules/storage/application/services/storage.service";

import { type Club, financeFixtures } from "./support/finance-club";
import { binary, MemoryStorage } from "./support/memory-storage";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).format(new Date());
const [year, month] = today.split("-").map(Number) as [number, number];
const quarter = Math.floor((month - 1) / 3) + 1;
const QUARTER_QUERY = `year=${year}&quarter=${quarter}`;

const SETTLE_POLLS = 100;
const SETTLE_STEP_MS = 100;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

type Cell = { code: string; value: number; entryCount: number };
type Form = {
    form: string;
    applicable: boolean;
    reason: string | null;
    cells: Cell[];
    notes: string[];
};

const cell = (form: Form | undefined, code: string): Cell | undefined =>
    form?.cells.find((candidate) => candidate.code === code);

/**
 * Отчёты учёта (TASK-799): цифры формы 303 из проводок и переход к проводкам ячейки, 130 не
 * подаёт ассоциация, отчёт за период, права finance.read / admin, изоляция клубов; PDF —
 * фоновая операция, файл шифром в хранилище, скачать может только автор и только до срока.
 */
describe("Finance reports (e2e)", () => {
    let app: INestApplication;
    let fx: ReturnType<typeof financeFixtures>;
    let clubA: Club;
    let clubB: Club;
    let manager: string;
    let employee: string;
    let saleId: string;
    const storage = new MemoryStorage();

    const forms = async (club: Club, cookies?: string) => {
        const res = await fx.crm(
            club,
            "get",
            `/crm/finance/reports/forms?${QUARTER_QUERY}`,
            cookies
        );
        return { status: res.status, forms: res.body as Form[] };
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(StorageService)
            .useValue(storage)
            .compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        fx = financeFixtures(app, "rep", suffix);
        clubA = await fx.register("a");
        clubB = await fx.register("b");
        await fx.enableFinance(clubA);
        await fx.enableFinance(clubB);
        manager = await fx.seedEmployee(clubA, "manager");
        employee = await fx.seedEmployee(clubA, "employee");

        const rates = (await fx.crm(clubA, "get", "/crm/finance/tax-rates")).body as {
            id: string;
            presetCode: string | null;
        }[];
        const rate = (code: string) => rates.find((item) => item.presetCode === code)?.id;
        const categories = (await fx.crm(clubA, "get", "/crm/finance/categories")).body as {
            id: string;
            code: string;
        }[];
        const category = (code: string) => categories.find((item) => item.code === code)?.id;
        const record = async (body: object): Promise<string> => {
            const res = await fx.crm(clubA, "post", "/crm/finance/entries").send({
                occurredOn: today,
                account: "bank",
                ...body,
            });
            expect(res.status).toBe(201);
            return (res.body as { id: string }).id;
        };
        saleId = await record({
            direction: "income",
            categoryId: category("sales"),
            amount: 110,
            taxRateId: rate("es_reduced"),
            description: "Venta",
        });
        await record({
            direction: "income",
            categoryId: category("membership_fees"),
            amount: 50,
            taxRateId: rate("es_exempt"),
            description: "Cuota",
        });
        await record({
            direction: "expense",
            categoryId: category("rent"),
            amount: 121,
            taxRateId: rate("es_general"),
            description: "Alquiler",
        });
    });

    afterAll(async () => {
        await fx.cleanup([clubA, clubB]);
        await app.close();
    });

    it("303 по проводкам квартала, пометка о пропорции; 130 ассоциация не подаёт", async () => {
        const { status, forms: list } = await forms(clubA);
        expect(status).toBe(200);
        const vat = list.find((form) => form.form === "es_303");
        expect(vat?.applicable).toBe(true);
        expect(cell(vat, "04")).toMatchObject({ value: 100, entryCount: 1 });
        expect(cell(vat, "06")?.value).toBe(10);
        expect(cell(vat, "28")?.value).toBe(100);
        expect(cell(vat, "29")?.value).toBe(21);
        expect(cell(vat, "46")?.value).toBe(-11);
        expect(vat?.notes).toContain("prorrata_review");
        const irpf = list.find((form) => form.form === "es_130");
        expect(irpf).toMatchObject({ applicable: false, reason: "not_self_employed", cells: [] });
    });

    it("ячейка открывает свои проводки; неизвестная ячейка — 404", async () => {
        const res = await fx.crm(
            clubA,
            "get",
            `/crm/finance/reports/forms/es_303/cells/06/entries?${QUARTER_QUERY}`
        );
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(1);
        expect(res.body.items[0].id).toBe(saleId);
        const missing = await fx.crm(
            clubA,
            "get",
            `/crm/finance/reports/forms/es_303/cells/88/entries?${QUARTER_QUERY}`
        );
        expect(missing.status).toBe(404);
        expect(missing.body.code).toBe("report_cell_not_found");
    });

    it("отчёт за период: IVA обеих сторон и движение по банку", async () => {
        const res = await fx.crm(
            clubA,
            "get",
            `/crm/finance/reports/period?from=${today}&to=${today}`
        );
        expect(res.status).toBe(200);
        expect(res.body.vat).toMatchObject({ outputTax: 10, inputTax: 21, balance: -11 });
        const bank = (res.body.accounts as { account: string }[]).find(
            (flow) => flow.account === "bank"
        );
        expect(bank).toMatchObject({ opening: 0, inflow: 160, outflow: 121, closing: 39 });
    });

    it("права: без finance.read — 403; менеджер видит формы; другой клуб видит только своё", async () => {
        expect((await forms(clubA, employee)).status).toBe(403);
        expect((await forms(clubA, manager)).status).toBe(200);
        const other = await forms(clubB);
        expect(
            cell(
                other.forms.find((form) => form.form === "es_303"),
                "04"
            )
        ).toMatchObject({
            value: 0,
            entryCount: 0,
        });
    });

    it("PDF: 202 и операция, файл шифром, скачивает только автор и до срока", async () => {
        const body = { year, quarter };
        expect(
            (await fx.crm(clubA, "post", "/crm/finance/reports/pdf", manager).send(body)).status
        ).toBe(403);
        const started = await fx.crm(clubA, "post", "/crm/finance/reports/pdf").send(body);
        expect(started.status).toBe(202);
        const operationId = (started.body as { operationId: string }).operationId;

        type PolledOperation = { status: string; result: Record<string, string> | null };
        let operation: PolledOperation | null = null;
        for (let i = 0; i < SETTLE_POLLS && operation?.status !== "done"; i += 1) {
            const res = await fx.crm(clubA, "get", `/crm/operations/${operationId}`);
            operation = res.body as PolledOperation;
            if (operation?.status === "failed") throw new Error("report operation failed");
            if (operation?.status !== "done") await sleep(SETTLE_STEP_MS);
        }
        expect(operation?.result?.fileName).toBe(`informe-${year}-${quarter}T.pdf`);
        const stored = [...storage.files.values()].at(-1);
        expect(stored).toBeDefined();
        expect(stored?.subarray(0, 5).toString("latin1")).not.toBe("%PDF-");

        const path = `/crm/finance/reports/files/${operationId}`;
        const file = await fx.crm(clubA, "get", path).buffer(true).parse(binary);
        expect(file.status).toBe(200);
        expect(file.headers["content-type"]).toContain("application/pdf");
        expect((file.body as Buffer).subarray(0, 5).toString("latin1")).toBe("%PDF-");
        expect((await fx.crm(clubB, "get", path)).status).toBe(404);

        await fx.prisma.operation.update({
            where: { id: operationId },
            data: { result: { ...operation?.result, expiresAt: "2000-01-01T00:00:00.000Z" } },
        });
        const expired = await fx.crm(clubA, "get", path);
        expect(expired.status).toBe(410);
        expect(expired.body.code).toBe("report_file_expired");
    });
});
