import { z } from "zod";

import type {
    FinanceCategory,
    LedgerDirection,
    LedgerEntry,
    LedgerEntryInput,
    TaxRate,
} from "@/modules/entities/finance";
import type { MemberChoice } from "@/modules/entities/member";

/** Сообщения — ключи `crm.finance.entryForm.errors.*`. */
const hasCents = (value: number) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6;
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const ACCOUNTS = ["cash", "bank", "card"] as const;
const DOCUMENT_TYPES = ["none", "receipt", "invoice_received", "invoice_issued"] as const;

type CrossFieldValues = {
    direction: LedgerDirection;
    categoryId: string;
    account: string;
    toAccount: string;
};

export interface CrossFieldIssue {
    path: "categoryId" | "toAccount";
    message: "required" | "sameAccount";
}

/**
 * Правила, связывающие поля: статья нужна доходу и расходу, перевод — между разными счетами.
 * Ими же проверяется шаг мастера: zod не запускает `superRefine`, пока не заполнены все поля.
 */
export const crossFieldIssues = (values: CrossFieldValues): CrossFieldIssue[] => {
    const issues: CrossFieldIssue[] = [];
    if (values.direction !== "transfer" && !values.categoryId) {
        issues.push({ path: "categoryId", message: "required" });
    }
    if (values.direction === "transfer" && values.toAccount === values.account) {
        issues.push({ path: "toAccount", message: "sameAccount" });
    }
    return issues;
};

export const ledgerEntryFormSchema = z
    .object({
        direction: z.enum(["income", "expense", "transfer"]),
        occurredOn: z.string().regex(DATE, "date"),
        categoryId: z.string(),
        account: z.enum(ACCOUNTS),
        toAccount: z.enum(ACCOUNTS),
        amount: z.number({ message: "amount" }).positive("amount").refine(hasCents, "amount"),
        amountIncludesTax: z.boolean(),
        /** "" — ставка по умолчанию: по статье или направлению */
        taxRateId: z.string(),
        withholdingPercent: z.number({ message: "percent" }).min(0, "percent").max(100, "percent"),
        description: z.string().trim().min(1, "required").max(500, "tooLong"),
        counterpartyId: z.string(),
        member: z.custom<MemberChoice | null>(),
        documentType: z.enum(DOCUMENT_TYPES),
        documentNumber: z.string().trim().max(60, "tooLong"),
        documentDate: z.string(),
        paidOn: z.string(),
        notes: z.string().max(2000, "tooLong"),
    })
    .superRefine((values, ctx) => {
        for (const issue of crossFieldIssues(values)) {
            ctx.addIssue({ code: "custom", path: [issue.path], message: issue.message });
        }
    });

export type LedgerEntryFormValues = z.infer<typeof ledgerEntryFormSchema>;

export const newEntryValues = (
    direction: LedgerDirection,
    today: string
): LedgerEntryFormValues => ({
    direction,
    occurredOn: today,
    categoryId: "",
    account: direction === "income" ? "cash" : "bank",
    toAccount: "bank",
    amount: Number.NaN,
    amountIncludesTax: true,
    taxRateId: "",
    withholdingPercent: 0,
    description: "",
    counterpartyId: "",
    member: null,
    documentType: "none",
    documentNumber: "",
    documentDate: "",
    paidOn: "",
    notes: "",
});

/** Правка ручной проводки: сумма — итог с налогом, ставка — ставка клуба с тем же процентом. */
export const entryValues = (
    entry: LedgerEntry,
    rates: readonly TaxRate[]
): LedgerEntryFormValues => {
    const line = entry.lines[0];
    const rate = rates.find((r) => r.percent === line?.percent && r.treatment === line?.treatment);
    return {
        ...newEntryValues(entry.direction, entry.occurredOn),
        categoryId: entry.categoryId ?? "",
        account: entry.account,
        toAccount: entry.toAccount ?? "bank",
        amount: entry.totals.total,
        taxRateId: rate?.id ?? "",
        withholdingPercent: entry.withholding?.percent ?? 0,
        description: entry.description ?? "",
        counterpartyId: entry.counterpartyId ?? "",
        documentType: entry.documentType,
        documentNumber: entry.documentNumber ?? "",
        documentDate: entry.documentDate ?? "",
        paidOn: entry.paidOn ?? "",
        notes: entry.notes ?? "",
    };
};

export const toLedgerEntryInput = (
    values: LedgerEntryFormValues,
    allowDuplicate = false
): LedgerEntryInput => {
    const transfer = values.direction === "transfer";
    return {
        direction: values.direction,
        occurredOn: values.occurredOn,
        categoryId: transfer ? null : values.categoryId,
        account: values.account,
        toAccount: transfer ? values.toAccount : null,
        amount: values.amount,
        amountIncludesTax: transfer ? true : values.amountIncludesTax,
        taxRateId: transfer || !values.taxRateId ? null : values.taxRateId,
        withholdingPercent: transfer ? 0 : values.withholdingPercent,
        description: values.description.trim(),
        notes: values.notes.trim() || null,
        counterpartyId: transfer || values.member ? null : values.counterpartyId || null,
        memberId: transfer ? null : (values.member?.id ?? null),
        documentType: transfer ? "none" : values.documentType,
        documentNumber: transfer ? null : values.documentNumber.trim() || null,
        documentDate: values.documentDate || null,
        paidOn: values.paidOn || null,
        allowDuplicate,
    };
};

/** Поставщик выставляет IVA по общей ставке, даже если клуб освобождён — как решает API. */
const EXPENSE_DEFAULT_RATE = "es_general";

/** Ставка «по умолчанию» — то же правило, что в API (`defaultEntryRate`). */
export const defaultEntryRate = (
    direction: LedgerDirection,
    category: Pick<FinanceCategory, "taxTreatment"> | undefined,
    rates: readonly TaxRate[]
): TaxRate | undefined => {
    const active = rates.filter((rate) => !rate.archivedAt);
    const treatment = category?.taxTreatment;
    if (treatment && treatment !== "taxable") return active.find((r) => r.treatment === treatment);
    const clubDefault = active.find((rate) => rate.isDefault);
    if (direction === "income") return clubDefault;
    return active.find((rate) => rate.presetCode === EXPENSE_DEFAULT_RATE) ?? clubDefault;
};

/** Предпросмотр сумм формы — тот же расчёт в центах, что у API (налог округляется до цента). */
export const previewTotals = (
    amount: number,
    includesTax: boolean,
    rate: Pick<TaxRate, "percent" | "treatment"> | undefined,
    withholdingPercent: number
) => {
    const cents = Math.round(amount * 100);
    const points = rate && rate.treatment === "taxable" ? Math.round(rate.percent * 100) : 0;
    const net = includesTax ? Math.round((cents * 10_000) / (10_000 + points)) : cents;
    const tax = includesTax ? cents - net : Math.round((cents * points) / 10_000);
    const withholding = Math.round((net * Math.round(withholdingPercent * 100)) / 10_000);
    return {
        net: net / 100,
        tax: tax / 100,
        withholding: withholding / 100,
        payable: (net + tax - withholding) / 100,
    };
};
