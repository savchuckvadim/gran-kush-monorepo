import { MiB } from "@common/upload";

const envPositive = (key: string, fallback: number): number => {
    const parsed = Number(process.env[key]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Потолки учёта (TASK-798); переопределяются окружением в мегабайтах и строках. */
export const FINANCE_LIMITS = {
    /** Таблица импорта на пару тысяч строк весит сотни килобайт */
    importBytes: envPositive("FINANCE_IMPORT_MAX_MB", 5) * MiB,
    /** Строк за один импорт: отчёт по строкам должен поместиться в ответ и на экран */
    importRows: Math.floor(envPositive("FINANCE_IMPORT_MAX_ROWS", 2000)),
    /** Чек или фактура: фото с телефона или PDF */
    attachmentBytes: envPositive("FINANCE_ATTACHMENT_MAX_MB", 10) * MiB,
    /** Потолок суммы одной проводки, евро: опечатка в лишний ноль не уходит в отчёты */
    maxEntryAmount: 10_000_000,
};

/** Валюта учёта v1: многовалютности нет (finance-requirements §4). */
export const LEDGER_CURRENCY = "EUR";
