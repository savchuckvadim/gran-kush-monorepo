import { Injectable } from "@nestjs/common";

import { employeeActor } from "@modules/events";

import {
    BOOK_DIRECTION,
    BOOK_HEADERS,
    bookRows,
    ENTRY_EXPORT_HEADER,
    entryExportRows,
    type ExportContext,
    type LedgerBook,
    receptionNumbers,
} from "../../domain/export/ledger-export";
import type { Cell } from "../../domain/import/import-values";
import type { LedgerEntry } from "../../domain/ledger/ledger-entry";
import {
    FinanceAuditLog,
    FinanceDirectory,
} from "../../domain/repositories/finance-sources.interface";
import { LedgerRepository } from "../../domain/repositories/ledger-repository.interface";
import { LedgerSpreadsheet } from "../../domain/repositories/ledger-spreadsheet.interface";
import { financeAccessedEvent } from "../events/ledger-events";
import { buildLedgerFile, type LedgerFile, type LedgerFileFormat } from "../ledger-files";
import { CounterpartiesService } from "../services/counterparties.service";
import { FinanceCategoriesService } from "../services/finance-categories.service";

export type ExportBook = LedgerBook | "entries";

export interface ExportQuery {
    from: string;
    to: string;
    book: ExportBook;
    format: LedgerFileFormat;
}

const FILE_NAMES: Record<ExportBook, string> = {
    entries: "movimientos",
    purchases: "libro-compras-gastos",
    sales: "libro-ventas-ingresos",
};

const WIDE_COLUMN = 28;
const NARROW_COLUMN = 14;
const WIDE_HEADERS = new Set([
    "concepto",
    "contraparte",
    "Concepto",
    "Nombre expedidor",
    "Nombre destinatario",
    "id",
]);

const widthOf = (header: string): number =>
    WIDE_HEADERS.has(header) ? WIDE_COLUMN : NARROW_COLUMN;

/**
 * Выгрузка учёта за период (`finance.admin`).
 * - `entries` — все проводки периода с отменёнными: колонки шаблона импорта и служебные;
 * - `purchases` и `sales` — книги compras y gastos и ventas e ingresos (Orden HAC/773/2019),
 *   только проведённые, сторно с минусом; номер приёма расхода считается по всему году;
 * - каждая выгрузка — событие `finance.accessed` в журнале клуба (без данных).
 */
@Injectable()
export class ExportLedgerUseCase {
    constructor(
        private readonly ledger: LedgerRepository,
        private readonly categories: FinanceCategoriesService,
        private readonly counterparties: CounterpartiesService,
        private readonly directory: FinanceDirectory,
        private readonly spreadsheet: LedgerSpreadsheet,
        private readonly audit: FinanceAuditLog
    ) {}

    async execute(portalId: string, employeeId: string, query: ExportQuery): Promise<LedgerFile> {
        const { header, rows } =
            query.book === "entries"
                ? await this.entries(portalId, query)
                : await this.book(portalId, query.book, query);
        const file = await buildLedgerFile(
            this.spreadsheet,
            [{ name: FILE_NAMES[query.book], header, rows, widths: header.map(widthOf) }],
            query.format,
            `${FILE_NAMES[query.book]}-${query.from}_${query.to}`
        );
        await this.audit.record([
            financeAccessedEvent(portalId, query.book, query, employeeActor(employeeId)),
        ]);
        return file;
    }

    private async entries(portalId: string, query: ExportQuery) {
        const entries = await this.ledger.listAll(portalId, {
            from: query.from,
            to: query.to,
            includeVoid: true,
        });
        return {
            header: ENTRY_EXPORT_HEADER,
            rows: entryExportRows(entries, await this.context(portalId, entries)),
        };
    }

    private async book(portalId: string, book: LedgerBook, query: ExportQuery) {
        const yearEntries = await this.ledger.listAll(portalId, {
            from: `${query.from.slice(0, 4)}-01-01`,
            to: query.to,
            direction: BOOK_DIRECTION[book],
            includeVoid: false,
        });
        const receptions = receptionNumbers(yearEntries);
        const entries = yearEntries.filter((entry) => entry.occurredOn >= query.from);
        const rows: Cell[][] = bookRows(
            book,
            entries,
            await this.context(portalId, entries),
            receptions
        );
        return { header: BOOK_HEADERS[book], rows };
    }

    private async context(
        portalId: string,
        entries: readonly LedgerEntry[]
    ): Promise<ExportContext> {
        const [categories, counterparties, authors] = await Promise.all([
            this.categories.list(portalId, true),
            this.counterparties.namesOf(
                portalId,
                entries.flatMap((entry) => (entry.counterpartyId ? [entry.counterpartyId] : []))
            ),
            this.directory.employeeNames(
                portalId,
                entries.flatMap((entry) => (entry.createdById ? [entry.createdById] : []))
            ),
        ]);
        return {
            categories: new Map(categories.map((category) => [category.id, category])),
            counterparties,
            authors,
        };
    }
}
