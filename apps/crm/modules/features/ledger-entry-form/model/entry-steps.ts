import type { LedgerEntryFormValues } from "./ledger-entry-form";

/** Шаги мастера проводки: что и когда → сколько и какой налог → с кем и по какому документу. */
export const ENTRY_STEPS = ["basics", "amount", "document"] as const;
export type EntryStep = (typeof ENTRY_STEPS)[number];

type FieldName = keyof LedgerEntryFormValues;

/** Поля каждого шага: «Далее» проверяет только их, ошибка записи открывает шаг поля. */
export const STEP_FIELDS: Record<EntryStep, readonly FieldName[]> = {
    basics: ["direction", "occurredOn", "categoryId", "account", "toAccount", "description"],
    amount: ["amount", "amountIncludesTax", "taxRateId", "withholdingPercent"],
    document: [
        "counterpartyId",
        "member",
        "documentType",
        "documentNumber",
        "documentDate",
        "paidOn",
        "notes",
    ],
};

/** Первый шаг, на котором есть поле с ошибкой. */
export const firstStepWithError = (fields: readonly string[]): EntryStep | undefined =>
    ENTRY_STEPS.find((step) => STEP_FIELDS[step].some((name) => fields.includes(name)));
