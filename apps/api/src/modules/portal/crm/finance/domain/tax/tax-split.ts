import { TaxTreatment } from "@prisma/client";

/** Как считать налог строки: ставка, режим и включён ли налог в цену. */
export interface LineTaxRule {
    percent: number;
    treatment: TaxTreatment;
    includesTax: boolean;
}

/** База, налог и итог строки в евро; итог — то, что платит покупатель. */
export interface LineTax {
    net: number;
    tax: number;
    gross: number;
}

const BASIS = 10_000;

/**
 * База и налог строки. Считается в целых центах, налог округляется до цента (половина — вверх),
 * поэтому база + налог всегда равны итогу. Цена с налогом — налог выделяется из суммы; без
 * налога — добавляется сверху. У exenta и no sujeta налог 0, итог равен базе.
 */
export const splitLineTax = (amount: number, rule: LineTaxRule): LineTax => {
    const cents = Math.round(amount * 100);
    const basisPoints =
        rule.treatment === TaxTreatment.taxable ? Math.round(rule.percent * 100) : 0;
    if (rule.includesTax) {
        const net = Math.round((cents * BASIS) / (BASIS + basisPoints));
        return { net: net / 100, tax: (cents - net) / 100, gross: cents / 100 };
    }
    const tax = Math.round((cents * basisPoints) / BASIS);
    return { net: cents / 100, tax: tax / 100, gross: (cents + tax) / 100 };
};

/** Сумма снимков строк заказа: база и налог заказа. */
export const sumLineTaxes = (lines: readonly LineTax[]): { net: number; tax: number } => {
    const cents = lines.reduce(
        (acc, line) => ({
            net: acc.net + Math.round(line.net * 100),
            tax: acc.tax + Math.round(line.tax * 100),
        }),
        { net: 0, tax: 0 }
    );
    return { net: cents.net / 100, tax: cents.tax / 100 };
};
