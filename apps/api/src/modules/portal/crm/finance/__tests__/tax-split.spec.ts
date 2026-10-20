import { TaxTreatment } from "@prisma/client";

import {
    defaultPresetCode,
    ES_TAX_RATE_PRESETS,
    percentFor,
} from "@modules/portal/crm/finance/domain/tax/tax-rate";
import { splitLineTax, sumLineTaxes } from "@modules/portal/crm/finance/domain/tax/tax-split";

const vat = (percent: number, includesTax: boolean) => ({
    percent,
    treatment: TaxTreatment.taxable,
    includesTax,
});

describe("налог строки", () => {
    it("цена с налогом: налог выделяется из суммы, база + налог = итог", () => {
        expect(splitLineTax(12.1, vat(21, true))).toEqual({ net: 10, tax: 2.1, gross: 12.1 });
        expect(splitLineTax(1, vat(10, true))).toEqual({ net: 0.91, tax: 0.09, gross: 1 });
        expect(splitLineTax(24.98, vat(21, true))).toEqual({ net: 20.64, tax: 4.34, gross: 24.98 });
    });

    it("цена без налога: налог сверху, округление до цента вверх с половины", () => {
        expect(splitLineTax(10, vat(21, false))).toEqual({ net: 10, tax: 2.1, gross: 12.1 });
        // 0.50 × 21 % = 0.105 → 0.11
        expect(splitLineTax(0.5, vat(21, false))).toEqual({ net: 0.5, tax: 0.11, gross: 0.61 });
        expect(splitLineTax(19.99, vat(4, false))).toEqual({ net: 19.99, tax: 0.8, gross: 20.79 });
    });

    it("exenta и no sujeta — без налога в обе стороны; подарок — нули", () => {
        for (const treatment of [TaxTreatment.exempt, TaxTreatment.not_subject]) {
            for (const includesTax of [true, false]) {
                expect(splitLineTax(15, { percent: 21, treatment, includesTax })).toEqual({
                    net: 15,
                    tax: 0,
                    gross: 15,
                });
            }
        }
        expect(splitLineTax(0, vat(21, true))).toEqual({ net: 0, tax: 0, gross: 0 });
    });

    it("итоги заказа складываются в центах", () => {
        const lines = [splitLineTax(0.1, vat(21, false)), splitLineTax(0.2, vat(21, false))];
        expect(sumLineTaxes(lines)).toEqual({ net: 0.3, tax: 0.06 });
    });
});

describe("ставки Испании", () => {
    it("пресет: 21, 10, 4, 0, exenta, no sujeta; по умолчанию — по режиму IVA", () => {
        expect(
            ES_TAX_RATE_PRESETS.map((rate) => [rate.code, rate.percent, rate.treatment])
        ).toEqual([
            ["es_general", 21, "taxable"],
            ["es_reduced", 10, "taxable"],
            ["es_super_reduced", 4, "taxable"],
            ["es_zero", 0, "taxable"],
            ["es_exempt", 0, "exempt"],
            ["es_not_subject", 0, "not_subject"],
        ]);
        expect(defaultPresetCode("exempt")).toBe("es_exempt");
        expect(defaultPresetCode("general")).toBe("es_general");
        expect(defaultPresetCode("equivalence_surcharge")).toBe("es_general");
    });

    it("у exenta и no sujeta процент всегда 0", () => {
        expect(percentFor(TaxTreatment.exempt, 7)).toBe(0);
        expect(percentFor(TaxTreatment.not_subject, 21)).toBe(0);
        expect(percentFor(TaxTreatment.taxable, 5)).toBe(5);
    });
});
