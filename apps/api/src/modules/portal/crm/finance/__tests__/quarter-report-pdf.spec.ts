import { writeFileSync } from "node:fs";

import {
    FinanceAccount,
    IncomeTaxRegime,
    LedgerDirection,
    LegalForm,
    TaxTreatment,
    VatRegime,
} from "@prisma/client";

import { summarize } from "../domain/ledger/ledger-summary";
import { EMPTY_IDENTITY } from "../domain/organization/organization-profile";
import { accountFlows } from "../domain/reports/account-flows";
import { esForm130 } from "../domain/reports/es-form-130";
import { esForm303 } from "../domain/reports/es-form-303";
import { quarterReportDocument } from "../domain/reports/quarter-report-document";
import { quarterPeriod } from "../domain/reports/report-period";
import { vatBreakdown } from "../domain/reports/vat-breakdown";
import { withholdingTotals } from "../domain/reports/withholding-totals";
import { PdfkitReportRenderer } from "../infrastructure/reports/pdfkit-report-renderer";

import { ledgerEntry } from "./ledger-fixtures";

const period = quarterPeriod(2026, 4);
const sale = ledgerEntry({
    id: "sale",
    direction: LedgerDirection.income,
    occurredOn: "2026-10-10",
    categoryId: "sales",
    account: FinanceAccount.bank,
    secret: {
        lines: [{ percent: 21, treatment: TaxTreatment.taxable, net: 123456, tax: 25926 }],
    },
});
const entries = [sale, ledgerEntry({ id: "rent", occurredOn: "2026-11-02" })];

const input = (forms = [esForm303(entries, { vatRegime: VatRegime.general }, period)]) => ({
    identity: {
        ...EMPTY_IDENTITY,
        legalName: "Asociación Cannábica Ñandú",
        taxId: "G12345678",
        city: "Málaga",
    },
    period,
    summary: summarize(entries),
    categories: [],
    vat: vatBreakdown(entries),
    withholding: withholdingTotals(entries),
    accounts: accountFlows(entries, period.from),
    forms,
    generatedAt: new Date("2026-11-04T09:30:00Z"),
    timeZone: "Europe/Madrid",
});

describe("квартальный отчёт PDF", () => {
    it("документ: реквизиты, период по-испански, суммы в евро, формы и разделы", () => {
        const document = quarterReportDocument(
            input([
                esForm303(entries, { vatRegime: VatRegime.general }, period),
                esForm130(
                    entries,
                    {
                        legalForm: LegalForm.association,
                        incomeTaxRegime: IncomeTaxRegime.corporate_partially_exempt,
                    },
                    period
                ),
            ])
        );
        expect(document.organization).toEqual([
            "Asociación Cannábica Ñandú",
            "NIF G12345678",
            "Málaga",
        ]);
        expect(document.subtitle).toBe("4T 2026 · del 01/10/2026 al 31/12/2026");
        expect(document.generatedAt).toBe("Generado el 4/11/26, 10:30");
        const vat303 = document.sections.find((section) => section.title.startsWith("Modelo 303"));
        expect(vat303?.rows.find((row) => row.cells[0] === "[07]")?.cells[2]).toBe("1234,56 €");
        const form130 = document.sections.find((section) => section.title.startsWith("Modelo 130"));
        expect(form130?.rows).toEqual([]);
        expect(form130?.notes[0]).toContain("autónomos");
    });

    it("PDF собирается и начинается с заголовка формата", async () => {
        const pdf = await new PdfkitReportRenderer().renderPdf(quarterReportDocument(input()));
        expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
        expect(pdf.length).toBeGreaterThan(1000);
        // посмотреть глазами: REPORT_PDF_SAMPLE=/tmp/report.pdf pnpm test quarter-report-pdf
        if (process.env.REPORT_PDF_SAMPLE) writeFileSync(process.env.REPORT_PDF_SAMPLE, pdf);
    });
});
