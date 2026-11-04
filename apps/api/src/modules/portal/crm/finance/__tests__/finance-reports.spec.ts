import {
    FinanceAccount,
    IncomeTaxRegime,
    LedgerDirection,
    LegalForm,
    TaxTreatment,
    VatRegime,
} from "@prisma/client";

import { type LedgerLine, reversedSecret } from "../domain/ledger/ledger-entry";
import { accountFlows } from "../domain/reports/account-flows";
import { ES_HARD_TO_JUSTIFY, esForm130 } from "../domain/reports/es-form-130";
import { esForm303 } from "../domain/reports/es-form-303";
import { quarterPeriod } from "../domain/reports/report-period";
import { cellOf, type TaxFormReport } from "../domain/reports/tax-form";
import { vatBreakdown } from "../domain/reports/vat-breakdown";
import { withholdingTotals } from "../domain/reports/withholding-totals";

import { ledgerEntry } from "./ledger-fixtures";

const taxable = (percent: number, net: number): LedgerLine => ({
    percent,
    treatment: TaxTreatment.taxable,
    net,
    tax: Math.round((net * percent) / 100),
});

const sale = (id: string, occurredOn: string, lines = [taxable(21, 10000)]) =>
    ledgerEntry({
        id,
        occurredOn,
        direction: LedgerDirection.income,
        categoryId: "sales",
        account: FinanceAccount.bank,
        secret: { lines },
    });

const expense = (id: string, occurredOn: string, lines = [taxable(21, 4000)]) =>
    ledgerEntry({ id, occurredOn, secret: { lines } });

const value = (report: TaxFormReport, code: string): number | undefined =>
    cellOf(report, code)?.value;

const Q4 = quarterPeriod(2026, 4);

describe("период отчёта", () => {
    it("квартал — первое и последнее число трёх месяцев", () => {
        expect(quarterPeriod(2026, 1)).toMatchObject({ from: "2026-01-01", to: "2026-03-31" });
        expect(quarterPeriod(2028, 1).to).toBe("2028-03-31");
        expect(Q4).toMatchObject({ from: "2026-10-01", to: "2026-12-31" });
    });
});

describe("IVA за период", () => {
    it("начисленный и уплаченный по ставкам, сторно со своим знаком", () => {
        const original = sale("s1", "2026-10-02", [taxable(21, 10000), taxable(10, 5000)]);
        const reversal = ledgerEntry({
            ...original,
            id: "s1-rev",
            reversalOfId: "s1",
            secret: reversedSecret(original.secret),
        });
        const vat = vatBreakdown([
            original,
            reversal,
            sale("s2", "2026-10-03"),
            expense("e1", "2026-10-04"),
        ]);
        expect(vat.output).toEqual([
            { percent: 21, treatment: TaxTreatment.taxable, base: 10000, tax: 2100, count: 3 },
            { percent: 10, treatment: TaxTreatment.taxable, base: 0, tax: 0, count: 2 },
        ]);
        expect(vat.input).toEqual([
            { percent: 21, treatment: TaxTreatment.taxable, base: 4000, tax: 840, count: 1 },
        ]);
        expect(vat).toMatchObject({ outputTax: 2100, inputTax: 840, balance: 1260 });
    });

    it("пустой период — нули", () => {
        expect(vatBreakdown([])).toEqual({
            output: [],
            input: [],
            outputTax: 0,
            inputTax: 0,
            balance: 0,
        });
    });
});

describe("удержания IRPF", () => {
    it("с наших доходов и с профессионалов отдельно, perceptores по контрагентам", () => {
        const consultancy = ledgerEntry({
            ...sale("s1", "2026-10-02"),
            secret: { lines: [taxable(21, 100000)], withholding: { percent: 15, amount: 15000 } },
        });
        const lawyer = (id: string, counterpartyId: string) =>
            ledgerEntry({
                id,
                counterpartyId,
                secret: { lines: [taxable(21, 50000)], withholding: { percent: 15, amount: 7500 } },
            });
        const totals = withholdingTotals([
            consultancy,
            lawyer("e1", "gestor"),
            lawyer("e2", "gestor"),
            expense("e3", "2026-10-05"),
        ]);
        expect(totals.received).toEqual({
            base: 100000,
            amount: 15000,
            count: 1,
            counterparties: 0,
        });
        expect(totals.applied).toEqual({
            base: 100000,
            amount: 15000,
            count: 2,
            counterparties: 1,
        });
    });
});

describe("касса и банк за период", () => {
    it("остаток на начало из прошлых проводок, сторно продажи уменьшает приход", () => {
        const earlier = sale("old", "2026-09-30");
        const current = sale("s1", "2026-10-02");
        const reversal = ledgerEntry({
            ...current,
            id: "s1-rev",
            occurredOn: "2026-10-03",
            reversalOfId: "s1",
            secret: reversedSecret(current.secret),
        });
        const rent = expense("rent", "2026-10-04");
        const transfer = ledgerEntry({
            id: "t1",
            occurredOn: "2026-10-05",
            direction: LedgerDirection.transfer,
            categoryId: null,
            account: FinanceAccount.bank,
            toAccount: FinanceAccount.cash,
            secret: { lines: [{ percent: 0, treatment: null, net: 3000, tax: 0 }] },
        });
        const flows = accountFlows([earlier, current, reversal, rent, transfer], "2026-10-01");
        expect(flows.find((flow) => flow.account === FinanceAccount.bank)).toEqual({
            account: FinanceAccount.bank,
            opening: 12100,
            inflow: 0,
            outflow: 3000,
            closing: 9100,
        });
        expect(flows.find((flow) => flow.account === FinanceAccount.cash)).toEqual({
            account: FinanceAccount.cash,
            opening: 0,
            inflow: 3000,
            outflow: 4840,
            closing: -1840,
        });
    });
});

describe("модель 303", () => {
    const general = { vatRegime: VatRegime.general };

    it("ставки бланка, исправления, вычет и результат", () => {
        const s1 = sale("s1", "2026-10-02", [taxable(21, 10000), taxable(10, 5000)]);
        const refund = ledgerEntry({
            ...sale("s2", "2026-10-03"),
            id: "s2-rev",
            reversalOfId: "s2",
            secret: reversedSecret(sale("s2", "2026-10-03").secret),
        });
        const report = esForm303(
            [s1, sale("s2", "2026-10-03"), refund, expense("e1", "2026-10-04")],
            general,
            Q4
        );
        expect(report.applicable).toBe(true);
        expect(value(report, "07")).toBe(20000);
        expect(value(report, "08")).toBe(21);
        expect(value(report, "09")).toBe(4200);
        expect(value(report, "04")).toBe(5000);
        expect(value(report, "06")).toBe(500);
        expect(value(report, "01")).toBe(0);
        expect(value(report, "14")).toBe(-10000);
        expect(value(report, "15")).toBe(-2100);
        expect(value(report, "27")).toBe(4200 + 500 - 2100);
        expect(value(report, "28")).toBe(4000);
        expect(value(report, "29")).toBe(840);
        expect(value(report, "45")).toBe(840);
        expect(value(report, "46")).toBe(2600 - 840);
        expect(cellOf(report, "09")?.entryIds).toEqual(["s1", "s2"]);
        expect(cellOf(report, "46")?.computed).toBe(true);
        expect(cellOf(report, "150")).toBeNull();
    });

    it("строки без ставки и своя ставка — пропущены с пометкой", () => {
        const legacy = sale("legacy", "2026-10-02", [
            { percent: 0, treatment: null, net: 5000, tax: 0 },
        ]);
        const custom = sale("custom", "2026-10-03", [taxable(7, 1000)]);
        const report = esForm303([legacy, custom], general, Q4);
        expect(report.notes).toEqual(["unclassified_lines", "unmapped_rate"]);
        expect(report.skippedEntryIds).toEqual(["legacy", "custom"]);
        expect(value(report, "27")).toBe(0);
    });

    it("освобождённые доходы рядом с вычетом — пометка о пропорции", () => {
        const fees = sale("fees", "2026-10-02", [
            { percent: 0, treatment: TaxTreatment.exempt, net: 30000, tax: 0 },
        ]);
        const report = esForm303([fees, expense("e1", "2026-10-03")], general, Q4);
        expect(report.notes).toContain("prorrata_review");
        expect(value(report, "07")).toBe(0);
    });

    it("освобождённая организация и recargo de equivalencia не подают", () => {
        expect(esForm303([], { vatRegime: VatRegime.exempt }, Q4)).toMatchObject({
            applicable: false,
            reason: "vat_exempt",
            cells: [],
        });
        expect(esForm303([], { vatRegime: VatRegime.equivalence_surcharge }, Q4).reason).toBe(
            "equivalence_surcharge"
        );
    });
});

describe("модель 130", () => {
    const normal = {
        legalForm: LegalForm.self_employed,
        incomeTaxRegime: IncomeTaxRegime.irpf_direct_normal,
    };

    it("нарастающим итогом с января, 05 — платежи прошлых кварталов", () => {
        const entries = [
            sale("q1", "2026-02-10", [taxable(21, 2000000)]),
            expense("q1e", "2026-03-01", [taxable(21, 1000000)]),
            ledgerEntry({
                ...sale("q2", "2026-05-10", [taxable(21, 1000000)]),
                secret: {
                    lines: [taxable(21, 1000000)],
                    withholding: { percent: 15, amount: 150000 },
                },
            }),
        ];
        const q2 = esForm130(entries, normal, quarterPeriod(2026, 2));
        expect(value(q2, "01")).toBe(3000000);
        expect(value(q2, "02")).toBe(1000000);
        expect(value(q2, "03")).toBe(2000000);
        expect(value(q2, "04")).toBe(400000);
        expect(value(q2, "05")).toBe(200000);
        expect(value(q2, "06")).toBe(150000);
        expect(value(q2, "07")).toBe(50000);
        expect(q2.notes).toEqual(["depreciation_missing", "previous_payments_estimated"]);

        const q1 = esForm130(entries, normal, quarterPeriod(2026, 1));
        expect(value(q1, "07")).toBe(200000);
        expect(q1.notes).toEqual(["depreciation_missing"]);
    });

    it("убыток — 04 ноль, отрицательный 07 прошлого квартала не уменьшает 05", () => {
        const entries = [
            expense("q1e", "2026-01-10", [taxable(21, 500000)]),
            sale("q2", "2026-04-10", [taxable(21, 1500000)]),
        ];
        const q1 = esForm130(entries, normal, quarterPeriod(2026, 1));
        expect(value(q1, "04")).toBe(0);
        const q2 = esForm130(entries, normal, quarterPeriod(2026, 2));
        expect(value(q2, "03")).toBe(1000000);
        expect(value(q2, "05")).toBe(0);
        expect(value(q2, "07")).toBe(200000);
    });

    it("simplificada — 5 % difícil justificación с потолком в год", () => {
        const simplified = { ...normal, incomeTaxRegime: IncomeTaxRegime.irpf_direct_simplified };
        const small = esForm130(
            [sale("s", "2026-01-10", [taxable(21, 1000000)])],
            simplified,
            quarterPeriod(2026, 1)
        );
        expect(value(small, "02")).toBe(50000);
        const large = esForm130(
            [sale("s", "2026-01-10", [taxable(21, 10000000)])],
            simplified,
            quarterPeriod(2026, 1)
        );
        expect(value(large, "02")).toBe(ES_HARD_TO_JUSTIFY.yearCapCents);
    });

    it("ассоциации и estimación objetiva 130 не подают", () => {
        expect(
            esForm130(
                [],
                {
                    legalForm: LegalForm.association,
                    incomeTaxRegime: IncomeTaxRegime.corporate_partially_exempt,
                },
                Q4
            ).reason
        ).toBe("not_self_employed");
        expect(
            esForm130([], { ...normal, incomeTaxRegime: IncomeTaxRegime.irpf_objective }, Q4).reason
        ).toBe("objective_regime");
    });
});
