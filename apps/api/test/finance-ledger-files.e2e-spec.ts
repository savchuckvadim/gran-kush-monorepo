import { INestApplication, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { LegacyLedgerMigration } from "../src/modules/portal/crm/finance/application/legacy-ledger.migration";
import { ExcelJsSpreadsheet } from "../src/modules/portal/crm/finance/infrastructure/spreadsheet/exceljs-spreadsheet";
import { StorageService } from "../src/modules/storage/application/services/storage.service";

import { type Club, financeFixtures } from "./support/finance-club";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).format(new Date());

/** S3 в e2e нет: хранилище в памяти, чтобы проверить, что туда уходит шифр, а не файл. */
class MemoryStorage {
    readonly files = new Map<string, Buffer>();

    uploadFile(file: { buffer: Buffer; originalname: string }, folder: string, type: string) {
        const relativePath = `${type}/${folder}/${randomUUID()}-${file.originalname}`;
        this.files.set(relativePath, file.buffer);
        return Promise.resolve({
            fileName: file.originalname,
            filePath: relativePath,
            relativePath,
            url: "",
        });
    }

    getFile(path: string): Promise<Buffer> {
        const file = this.files.get(path);
        return file ? Promise.resolve(file) : Promise.reject(new NotFoundException(path));
    }

    deleteFile(path: string): Promise<void> {
        this.files.delete(path);
        return Promise.resolve();
    }
}

const binary = (res: request.Response, callback: (error: Error | null, body: Buffer) => void) => {
    const chunks: Buffer[] = [];
    res.on("data", (chunk: Buffer) => chunks.push(chunk));
    res.on("end", () => callback(null, Buffer.concat(chunks)));
};

/**
 * Файлы учёта (TASK-798): вложение шифруется до хранилища и отдаётся расшифрованным; шаблон
 * импорта загружается как есть; импорт — отчёт по строкам, запись, повтор того же файла не
 * дублирует; выгрузка книг — finance.admin и событие в журнал; перенос старых проводок.
 */
describe("Finance ledger files (e2e)", () => {
    let app: INestApplication;
    let fx: ReturnType<typeof financeFixtures>;
    let club: Club;
    let manager: string;
    const storage = new MemoryStorage();
    const spreadsheet = new ExcelJsSpreadsheet();

    const download = (path: string, cookies?: string) =>
        fx.crm(club, "get", path, cookies).buffer(true).parse(binary);
    const upload = (path: string, file: Buffer, name: string) =>
        fx.crm(club, "post", path).attach("file", file, name);

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
        fx = financeFixtures(app, "fil", suffix);
        club = await fx.register("a");
        await fx.enableFinance(club);
        manager = await fx.seedEmployee(club, "manager");
    });

    afterAll(async () => {
        await fx.cleanup([club]);
        await app.close();
    });

    it("чек шифруется до хранилища и отдаётся расшифрованным; только картинки и PDF", async () => {
        const categories = await fx.crm(club, "get", "/crm/finance/categories");
        const rent = (categories.body as { id: string; code: string }[]).find(
            (c) => c.code === "rent"
        );
        const entry = await fx.crm(club, "post", "/crm/finance/entries").send({
            direction: "expense",
            occurredOn: today,
            categoryId: rent?.id,
            account: "bank",
            amount: 121,
            description: "Alquiler",
        });
        const path = `/crm/finance/entries/${entry.body.id}/attachment`;
        const pdf = Buffer.from("%PDF-1.4 recibo alquiler 121 EUR");
        const attached = await fx.crm(club, "put", path).attach("file", pdf, "Recibo alquiler.pdf");
        expect(attached.status).toBe(200);
        expect(attached.body.attachment).toEqual({
            name: "Recibo alquiler.pdf",
            mime: "application/pdf",
            size: pdf.length,
        });
        const [stored] = [...storage.files.values()];
        expect(stored.subarray(0, 4).toString("ascii")).toBe("PCB1");
        expect(stored.includes(Buffer.from("recibo"))).toBe(false);

        const file = await download(path, manager);
        expect(file.status).toBe(200);
        expect(file.headers["content-type"]).toContain("application/pdf");
        expect(file.body).toEqual(pdf);
        const html = await fx
            .crm(club, "put", path)
            .attach("file", Buffer.from("<html>"), "x.html");
        expect(html.body.code).toBe("attachment_type");
        expect((await fx.crm(club, "put", path, manager).attach("file", pdf, "a.pdf")).status).toBe(
            403
        );

        const removed = await fx.crm(club, "delete", path);
        expect(removed.body.attachment).toBeNull();
        expect(storage.files.size).toBe(0);
    });

    it("шаблон загружается как есть: отчёт без записи, запись, повтор — уже загружено", async () => {
        const template = await download("/crm/finance/import/template?format=xlsx");
        expect(template.status).toBe(200);
        expect(template.headers["content-disposition"]).toContain("plantilla-movimientos.xlsx");
        expect((await spreadsheet.read(template.body))?.[0]?.slice(0, 4)).toEqual([
            "tipo",
            "fecha",
            "categoria",
            "concepto",
        ]);
        const check = await upload("/crm/finance/import", template.body, "plantilla.xlsx");
        expect(check.status).toBe(200);
        expect(check.body).toMatchObject({ committed: false, created: 0 });
        expect(check.body.rows.map((row: { status: string }) => row.status)).toEqual([
            "create",
            "create",
            "create",
        ]);
        const commit = await upload("/crm/finance/import?commit=true", template.body, "p.xlsx");
        expect(commit.body).toMatchObject({ committed: true, created: 3 });
        const again = await upload("/crm/finance/import?commit=true", template.body, "p.xlsx");
        expect(again.body.created).toBe(0);
        expect(new Set(again.body.rows.map((row: { status: string }) => row.status))).toEqual(
            new Set(["duplicate"])
        );
        const parties = await fx.crm(club, "get", "/crm/finance/counterparties");
        expect(parties.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "Inmobiliaria Sol SL",
                    nif: "B12345674",
                    kind: "supplier",
                }),
                expect.objectContaining({ name: "Gestoría Martínez", nif: "12345678Z" }),
            ])
        );
    });

    it("csv: причины по строкам, дубль внутри файла, записываются только годные строки", async () => {
        const csv = [
            "tipo;fecha;categoria;concepto;contraparte;nif;documento;base;iva_pct;pago",
            "gasto;05/10/2026;utilities;Luz;Sol;B12345674;L-1;100;21;banco",
            "gasto;05/10/2026;utilities;Luz;Sol;B12345674;L-1;100;21;banco",
            "gasto;31/02/2026;utilities;Agua;;;;50;21;banco",
            "ingreso;06/10/2026;rent;Mal;;;;10;21;caja",
        ].join("\n");
        const res = await upload("/crm/finance/import?commit=true", Buffer.from(csv), "luz.csv");
        expect(res.status).toBe(200);
        expect(res.body.created).toBe(1);
        expect(res.body.rows).toEqual([
            expect.objectContaining({ row: 2, status: "create" }),
            expect.objectContaining({ row: 3, status: "duplicate" }),
            expect.objectContaining({
                row: 4,
                status: "error",
                issues: [{ column: "fecha", code: "invalid" }],
            }),
            expect.objectContaining({
                row: 5,
                status: "error",
                issues: [{ column: "categoria", code: "category_direction" }],
            }),
        ]);
        const missing = await upload(
            "/crm/finance/import",
            Buffer.from("tipo;fecha\ngasto;x"),
            "a.csv"
        );
        expect(missing.body).toMatchObject({ code: "import_missing_columns" });
    });

    it("книга расходов — finance.admin и событие в журнале без данных; проводки — xlsx", async () => {
        const query = `from=2026-01-01&to=${today}`;
        expect(
            (await download(`/crm/finance/export?${query}&book=purchases`, manager)).status
        ).toBe(403);
        const book = await download(`/crm/finance/export?${query}&book=purchases&format=csv`);
        expect(book.status).toBe(200);
        const text = book.body.toString("utf8");
        expect(text).toContain("Número de recepción");
        expect(text).toContain("B12345674;Inmobiliaria Sol SL");
        const events = await fx.prisma.domainEvent.findMany({
            where: { portalId: club.portalId, name: "finance.accessed" },
        });
        expect(events).toHaveLength(1);
        expect(JSON.stringify(events[0].payload)).not.toContain("Sol");
        const entries = await download(`/crm/finance/export?${query}&book=entries`);
        expect(entries.headers["content-type"]).toContain("spreadsheetml");
        const rows = await spreadsheet.read(entries.body);
        expect(rows?.[0]).toEqual(expect.arrayContaining(["tipo", "estado", "creado_por"]));
    });

    it("старые проводки переносятся шифром; повторный перенос ничего не дублирует", async () => {
        const legacy = await fx.prisma.financialTransaction.create({
            data: {
                portalId: club.portalId,
                type: "manual",
                direction: "expense",
                amount: 12.34,
                paymentMethod: "crypto",
                description: "Legacy gasto",
                transactionDate: new Date("2026-02-15T12:00:00Z"),
            },
        });
        const migration = app.get(LegacyLedgerMigration);
        expect(await migration.migrate()).toBeGreaterThanOrEqual(1);
        const where = { portalId: club.portalId, sourceType: "legacy", sourceId: legacy.id };
        const row = await fx.prisma.ledgerEntry.findFirstOrThrow({ where });
        expect(row.payload).not.toContain("Legacy");
        const res = await fx.crm(club, "get", `/crm/finance/entries/${row.id}`);
        expect(res.body).toMatchObject({
            occurredOn: "2026-02-15",
            account: "cash",
            description: "Legacy gasto",
            notes: "Pago: crypto",
            totals: { net: 12.34 },
        });
        await migration.migrate();
        expect(await fx.prisma.ledgerEntry.count({ where })).toBe(1);
    });
});
