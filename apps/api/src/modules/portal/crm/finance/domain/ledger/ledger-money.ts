import type { TaxTreatment } from "@prisma/client";

import { percentFor } from "../tax/tax-rate";
import { splitLineTax } from "../tax/tax-split";

import type { LedgerLine, LedgerWithholding } from "./ledger-entry";

/** Евро → целые центы. Суммы в проводках хранятся только в центах. */
export const toCents = (euros: number): number => Math.round(euros * 100);

export const fromCents = (cents: number): number => cents / 100;

export interface LineRule {
    percent: number;
    treatment: TaxTreatment;
    /** Сумма уже с налогом (чек на 121 €) или без него (база фактуры 100 €) */
    includesTax: boolean;
}

/**
 * Строка налога из введённой суммы: то же правило, что у строки заказа (`splitLineTax`) —
 * расчёт в центах, налог округляется до цента, база + налог равны итогу.
 */
export const lineFromAmount = (cents: number, rule: LineRule): LedgerLine => {
    const split = splitLineTax(fromCents(cents), rule);
    return {
        percent: percentFor(rule.treatment, rule.percent),
        treatment: rule.treatment,
        net: toCents(split.net),
        tax: toCents(split.tax),
    };
};

const BASIS_POINTS = 10_000;

/** Удержание IRPF с базы: 15 % с 1 000 € — 150 €; ноль процентов — удержания нет. */
export const withholdingOf = (netCents: number, percent: number): LedgerWithholding | null =>
    percent > 0
        ? {
              percent,
              amount: Math.round((netCents * Math.round(percent * 100)) / BASIS_POINTS),
          }
        : null;
