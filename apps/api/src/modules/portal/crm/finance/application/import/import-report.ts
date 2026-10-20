import type { ImportDraft, ImportIssue } from "../../domain/import/import-row";
import { IMPORT_ISSUES } from "../../domain/import/import-row";
import type { SheetProblem } from "../../domain/import/import-sheet";
import { comparableText } from "../../domain/text";

export type ImportRowStatus = "create" | "duplicate" | "error";

export interface ImportPreview {
    direction: "income" | "expense";
    occurredOn: string;
    categoryId: string;
    description: string;
    counterparty: string | null;
    /** К оплате или получению, центы: база + IVA − IRPF */
    total: number;
}

export interface ImportRowReport {
    row: number;
    status: ImportRowStatus;
    issues: ImportIssue[];
    preview: ImportPreview | null;
}

export interface ImportReport {
    committed: boolean;
    created: number;
    rows: ImportRowReport[];
}

export interface PlannedRow {
    row: number;
    sourceId: string;
    draft: ImportDraft | null;
    issues: ImportIssue[];
    status: ImportRowStatus;
    /** Кто контрагент в файле: `nif:<номер>` или `name:<имя>` — чтобы завести его один раз */
    partyKey: string | null;
    counterpartyId: string | null;
}

export const PROBLEM_MESSAGES: Record<SheetProblem["code"], string> = {
    import_empty: "The file has no rows",
    import_missing_columns: "Required columns are missing",
    import_too_many_rows: "Too many rows in one file",
};

export const IMPORT_FILE_TYPE = "import_file_type";

export const partyKeyOf = (draft: ImportDraft): string | null => {
    const party = draft.counterparty;
    if (!party) return null;
    return party.nif ? `nif:${party.nif}` : `name:${comparableText(party.name)}`;
};

export const markDuplicate = (row: PlannedRow, code: ImportIssue["code"]): void => {
    row.status = "duplicate";
    row.issues.push({ column: code === IMPORT_ISSUES.duplicate ? "documento" : null, code });
};

export const toReport = (row: PlannedRow): ImportRowReport => {
    const draft = row.draft;
    const preview: ImportPreview | null = draft
        ? {
              direction: draft.direction,
              occurredOn: draft.occurredOn,
              categoryId: draft.category.id,
              description: draft.description,
              counterparty: draft.counterparty?.name ?? null,
              total: draft.line.net + draft.line.tax - (draft.withholding?.amount ?? 0),
          }
        : null;
    return { row: row.row, status: row.status, issues: row.issues, preview };
};
