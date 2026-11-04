import { IncomeTaxRegime, LedgerDirection, LegalForm } from "@prisma/client";

import { type LedgerEntry, totalsOf } from "../ledger/ledger-entry";
import type { OrganizationTaxSettings } from "../organization/organization-profile";

import {
    isWithin,
    type QuarterPeriod,
    quarterPeriod,
    QUARTERS,
    yearStartOf,
} from "./report-period";
import {
    amountCell,
    FORM_NOT_APPLICABLE,
    FORM_NOTES,
    notApplicable,
    type TaxFormReport,
} from "./tax-form";

/** Pago fraccionado — 20 % положительного дохода нарастающим итогом (art. 110 LIRPF). */
const PAYMENT_PERCENT = 20;

/**
 * Gastos de difícil justificación в estimación directa simplificada: 5 % чистого дохода до
 * этой поправки, не больше 2 000 € в год (art. 30.2.4ª RIRPF). В 2023 году было 7 % — при смене
 * правил менять здесь.
 */
export const ES_HARD_TO_JUSTIFY = { percent: 5, yearCapCents: 200_000 } as const;

const PERCENT_BASE = 100;

const IRPF_DIRECT: readonly IncomeTaxRegime[] = [
    IncomeTaxRegime.irpf_direct_simplified,
    IncomeTaxRegime.irpf_direct_normal,
];

interface Accumulated {
    income: number;
    incomeIds: string[];
    expenses: number;
    expenseIds: string[];
    withheld: number;
    withheldIds: string[];
}

const accumulate = (entries: readonly LedgerEntry[]): Accumulated => {
    const sum: Accumulated = {
        income: 0,
        incomeIds: [],
        expenses: 0,
        expenseIds: [],
        withheld: 0,
        withheldIds: [],
    };
    for (const entry of entries) {
        const { net, withholding } = totalsOf(entry.secret);
        if (entry.direction === LedgerDirection.income) {
            sum.income += net;
            sum.incomeIds.push(entry.id);
            if (entry.secret.withholding) {
                sum.withheld += withholding;
                sum.withheldIds.push(entry.id);
            }
        } else if (entry.direction === LedgerDirection.expense) {
            sum.expenses += net;
            sum.expenseIds.push(entry.id);
        }
    }
    return sum;
};

const percentOf = (cents: number, percent: number): number =>
    Math.round((cents * percent) / PERCENT_BASE);

interface QuarterFigures {
    sums: Accumulated;
    deductible: number;
    net: number;
    payment: number;
}

const figuresOf = (sums: Accumulated, simplified: boolean): QuarterFigures => {
    const before = sums.income - sums.expenses;
    const provision = simplified
        ? Math.min(
              Math.max(0, percentOf(before, ES_HARD_TO_JUSTIFY.percent)),
              ES_HARD_TO_JUSTIFY.yearCapCents
          )
        : 0;
    const deductible = sums.expenses + provision;
    const net = sums.income - deductible;
    return { sums, deductible, net, payment: percentOf(Math.max(0, net), PAYMENT_PERCENT) };
};

/**
 * Модель 130 (pago fraccionado IRPF autónomo в estimación directa) за квартал. Все суммы —
 * нарастающим итогом с 1 января по конец квартала:
 * - 01 доходы по базе, 02 расходы по базе (+ difícil justificación в simplificada), 03 = 01 − 02;
 * - 04 = 20 % от 03, если он положительный; 06 — IRPF, удержанный клиентами с наших доходов;
 * - 05 — платежи прошлых кварталов года: CRM считает их так же, по проводкам, — это оценка, а
 *   не поданные формы (пометка); 07 = 04 − 05 − 06.
 * Амортизации в учёте нет (TASK-806) — пометка. Обществам и ассоциациям 130 не нужен (их
 * налог — IS, форма 200/202), estimación objetiva подаёт 131.
 * `entries` — проведённые проводки с 1 января по конец квартала.
 */
export const esForm130 = (
    entries: readonly LedgerEntry[],
    settings: Pick<OrganizationTaxSettings, "legalForm" | "incomeTaxRegime">,
    period: QuarterPeriod
): TaxFormReport => {
    if (settings.incomeTaxRegime === IncomeTaxRegime.irpf_objective) {
        return notApplicable("es_130", period, FORM_NOT_APPLICABLE.objectiveRegime);
    }
    if (
        settings.legalForm !== LegalForm.self_employed ||
        !IRPF_DIRECT.includes(settings.incomeTaxRegime)
    ) {
        return notApplicable("es_130", period, FORM_NOT_APPLICABLE.notSelfEmployed);
    }
    const simplified = settings.incomeTaxRegime === IncomeTaxRegime.irpf_direct_simplified;
    const yearStart = yearStartOf(period);
    let previousPayments = 0;
    for (const quarter of QUARTERS.filter((candidate) => candidate < period.quarter)) {
        const to = quarterPeriod(period.year, quarter).to;
        const earlier = figuresOf(
            accumulate(entries.filter((entry) => isWithin(entry.occurredOn, yearStart, to))),
            simplified
        );
        const due = earlier.payment - previousPayments - earlier.sums.withheld;
        previousPayments += Math.max(0, due);
    }
    const current = figuresOf(
        accumulate(entries.filter((entry) => isWithin(entry.occurredOn, yearStart, period.to))),
        simplified
    );
    const { sums } = current;
    return {
        form: "es_130",
        period,
        applicable: true,
        reason: null,
        cells: [
            amountCell("01", sums.income, sums.incomeIds),
            amountCell("02", current.deductible, sums.expenseIds),
            amountCell("03", current.net, [], true),
            amountCell("04", current.payment, [], true),
            amountCell("05", previousPayments, [], true),
            amountCell("06", sums.withheld, sums.withheldIds),
            amountCell("07", current.payment - previousPayments - sums.withheld, [], true),
        ],
        notes:
            period.quarter > 1
                ? [FORM_NOTES.depreciation, FORM_NOTES.previousPayments]
                : [FORM_NOTES.depreciation],
        skippedEntryIds: [],
    };
};
