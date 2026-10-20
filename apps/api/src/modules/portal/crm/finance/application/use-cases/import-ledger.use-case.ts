import { BadRequestException, Injectable } from "@nestjs/common";

import { CounterpartyKind } from "@prisma/client";
import { createHash, randomUUID } from "crypto";

import { isUniqueViolationOn } from "@common/prisma/unique-violation";
import { employeeActor } from "@modules/events";

import { IMPORT_ISSUES, type ImportDraft, parseImportRow } from "../../domain/import/import-row";
import { readImportSheet, type SheetRow } from "../../domain/import/import-sheet";
import { monthKey, monthOf } from "../../domain/ledger/finance-period";
import { LEDGER_SOURCES, normalizeDocumentNumber } from "../../domain/ledger/ledger-entry";
import { CounterpartyRepository } from "../../domain/repositories/counterparty-repository.interface";
import { FinancePeriodRepository } from "../../domain/repositories/finance-period-repository.interface";
import {
    type DocumentKey,
    documentKeyOf,
    LedgerRepository,
} from "../../domain/repositories/ledger-repository.interface";
import { LedgerSpreadsheet } from "../../domain/repositories/ledger-spreadsheet.interface";
import { FINANCE_LIMITS } from "../../finance.limits";
import { entriesImportedEvent } from "../events/ledger-events";
import { importEntryOf } from "../import/import-entry";
import {
    IMPORT_FILE_TYPE,
    type ImportReport,
    markDuplicate,
    partyKeyOf,
    type PlannedRow,
    PROBLEM_MESSAGES,
    toReport,
} from "../import/import-report";
import { rethrowClosedPeriod } from "../ledger-errors";
import { FinanceCategoriesService } from "../services/finance-categories.service";

/**
 * Импорт таблицы доходов и расходов (шаблон — `LedgerTemplateService`).
 * - файл — xlsx или csv по содержимому, первая строка — заголовки; нет обязательных колонок —
 *   400 `import_missing_columns`; строк больше `FINANCE_LIMITS.importRows` — 400;
 * - строка с ошибкой не записывается, остальные — да; причина и колонка — в отчёте;
 * - дубль — тот же контрагент, номер документа и дата выше в файле или среди проведённых;
 *   строка уже загруженного файла (тот же файл, та же строка) — `already_imported`;
 * - строка закрытого месяца — ошибка `period_closed`;
 * - контрагент находится по NIF или по имени, иначе заводится при записи (поставщик у расхода,
 *   клиент у дохода);
 * - `commit=false` — только отчёт; `commit=true` — запись одной транзакцией и одно событие
 *   `finance.entries_imported`.
 */
@Injectable()
export class ImportLedgerUseCase {
    constructor(
        private readonly spreadsheet: LedgerSpreadsheet,
        private readonly categories: FinanceCategoriesService,
        private readonly counterparties: CounterpartyRepository,
        private readonly ledger: LedgerRepository,
        private readonly periods: FinancePeriodRepository
    ) {}

    async execute(
        portalId: string,
        employeeId: string,
        file: Buffer,
        commit: boolean
    ): Promise<ImportReport> {
        const table = await this.spreadsheet.read(file);
        if (!table) {
            throw new BadRequestException({
                message: "Upload an .xlsx or .csv file",
                code: IMPORT_FILE_TYPE,
            });
        }
        const sheet = readImportSheet(table, FINANCE_LIMITS.importRows);
        if ("problem" in sheet) {
            throw new BadRequestException({
                message: PROBLEM_MESSAGES[sheet.problem.code],
                ...sheet.problem,
            });
        }
        const fileHash = createHash("sha256").update(file).digest("hex");
        const rows = await this.plan(portalId, fileHash, sheet.rows);
        await this.matchCounterparties(portalId, rows);
        await this.markDuplicates(portalId, rows);
        const created = commit ? await this.commit(portalId, employeeId, rows) : 0;
        return { committed: commit, created, rows: rows.map(toReport) };
    }

    private async plan(
        portalId: string,
        fileHash: string,
        sheetRows: readonly SheetRow[]
    ): Promise<PlannedRow[]> {
        const [categories, periods] = await Promise.all([
            this.categories.list(portalId, false),
            this.periods.list(portalId),
        ]);
        const byCode = new Map(
            categories.map((category) => [category.code.toLowerCase(), category])
        );
        const closed = new Set(periods.filter((period) => period.closedAt).map(monthKey));
        const rows = sheetRows.map(({ row, cells }): PlannedRow => {
            const { draft, issues } = parseImportRow(cells, byCode);
            if (draft && closed.has(monthKey(monthOf(draft.occurredOn)))) {
                issues.push({ column: "fecha", code: IMPORT_ISSUES.periodClosed });
            }
            const ok = draft !== null && issues.length === 0;
            return {
                row,
                sourceId: `${fileHash}:${row}`,
                draft: ok ? draft : null,
                issues,
                status: ok ? "create" : "error",
                partyKey: ok ? partyKeyOf(draft) : null,
                counterpartyId: null,
            };
        });
        const imported = await this.ledger.existingSources(
            portalId,
            LEDGER_SOURCES.import,
            rows.filter((r) => r.status === "create").map((r) => r.sourceId)
        );
        for (const row of rows) {
            if (row.status === "create" && imported.has(row.sourceId)) {
                markDuplicate(row, IMPORT_ISSUES.alreadyImported);
            }
        }
        return rows;
    }

    private async matchCounterparties(portalId: string, rows: PlannedRow[]): Promise<void> {
        const parties = rows.flatMap((row) =>
            row.draft?.counterparty ? [{ row, party: row.draft.counterparty }] : []
        );
        const nifs = [...new Set(parties.flatMap(({ party }) => (party.nif ? [party.nif] : [])))];
        const names = [...new Set(parties.flatMap(({ party }) => (party.nif ? [] : [party.name])))];
        if (nifs.length === 0 && names.length === 0) return;
        const { byNif, byName } = await this.counterparties.findMatches(portalId, { nifs, names });
        for (const { row, party } of parties) {
            row.counterpartyId =
                (party.nif ? byNif.get(party.nif) : byName.get(party.name))?.id ?? null;
        }
    }

    private async markDuplicates(portalId: string, rows: PlannedRow[]): Promise<void> {
        const seen = new Set<string>();
        const known: { row: PlannedRow; key: DocumentKey }[] = [];
        for (const row of rows) {
            const draft = row.draft;
            if (row.status !== "create" || !draft || !row.partyKey || !draft.documentNumber)
                continue;
            const fileKey = `${row.partyKey}|${normalizeDocumentNumber(draft.documentNumber)}|${draft.occurredOn}`;
            if (seen.has(fileKey)) {
                markDuplicate(row, IMPORT_ISSUES.duplicate);
                continue;
            }
            seen.add(fileKey);
            if (row.counterpartyId) {
                known.push({
                    row,
                    key: {
                        counterpartyId: row.counterpartyId,
                        documentNumber: draft.documentNumber,
                        occurredOn: draft.occurredOn,
                    },
                });
            }
        }
        const existing = await this.ledger.existingDocuments(
            portalId,
            known.map((k) => k.key)
        );
        for (const { row, key } of known) {
            if (existing.has(documentKeyOf(key))) markDuplicate(row, IMPORT_ISSUES.duplicate);
        }
    }

    private async commit(
        portalId: string,
        employeeId: string,
        rows: PlannedRow[]
    ): Promise<number> {
        const ready = rows.filter((row) => row.status === "create" && row.draft);
        if (ready.length === 0) return 0;
        const createdParties = new Map<string, string>();
        for (const row of ready) {
            if (!row.draft?.counterparty || row.counterpartyId || !row.partyKey) continue;
            const id =
                createdParties.get(row.partyKey) ??
                (await this.createCounterparty(portalId, row.draft));
            createdParties.set(row.partyKey, id);
            row.counterpartyId = id;
        }
        const entries = ready.map((row) => importEntryOf(row, employeeId));
        const actor = employeeActor(employeeId);
        return this.ledger
            .create(portalId, entries, (count) =>
                count > 0
                    ? [
                          entriesImportedEvent(
                              portalId,
                              count,
                              entries.map((e) => e.occurredOn),
                              actor
                          ),
                      ]
                    : []
            )
            .catch(rethrowClosedPeriod);
    }

    /** Новый контрагент из файла; тот же NIF успел появиться — берётся найденный. */
    private async createCounterparty(portalId: string, draft: ImportDraft): Promise<string> {
        const party = draft.counterparty;
        if (!party) throw new Error("Import row has no counterparty");
        const kind =
            draft.direction === "expense" ? CounterpartyKind.supplier : CounterpartyKind.customer;
        try {
            const created = await this.counterparties.create(
                portalId,
                {
                    id: randomUUID(),
                    kind,
                    details: {
                        name: party.name,
                        nif: party.nif,
                        country: party.country,
                        notes: null,
                    },
                },
                []
            );
            return created.id;
        } catch (error) {
            const found =
                party.nif && isUniqueViolationOn(error, "nif_index")
                    ? await this.counterparties.findByNif(portalId, party.nif)
                    : null;
            if (found) return found.id;
            throw error;
        }
    }
}
