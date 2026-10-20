import { LedgerDirection, TaxTreatment } from "@prisma/client";

import { bookRows, entryExportRows, receptionNumbers } from "../domain/export/ledger-export";
import type { FinanceCategory } from "../domain/ledger/finance-category";
import { reversedSecret } from "../domain/ledger/ledger-entry";

import { ledgerEntry } from "./ledger-fixtures";

const rentCategory: FinanceCategory = {
    id: "rent",
    code: "rent",
    name: null,
    direction: "expense",
    pgcAccount: "621",
    taxTreatment: null,
    isPreset: true,
    sortOrder: 30,
    archivedAt: null,
};

const context = {
    categories: new Map([["rent", rentCategory]]),
    counterparties: new Map([["sol", { name: "Inmobiliaria Sol SL", nif: "B12345674" }]]),
    authors: new Map([["emp", "Ana"]]),
};

const invoice = ledgerEntry({
    id: "e1",
    counterpartyId: "sol",
    createdById: "emp",
    secret: {
        documentNumber: "F-118",
        lines: [
            { percent: 21, treatment: TaxTreatment.taxable, net: 100000, tax: 21000 },
            { percent: 0, treatment: TaxTreatment.exempt, net: 5000, tax: 0 },
        ],
        withholding: { percent: 15, amount: 15000 },
    },
});

describe("выгрузки учёта", () => {
    it("проводки — колонками шаблона, строка на ставку, удержание на первой строке", () => {
        const rows = entryExportRows([invoice], context);
        expect(rows).toHaveLength(2);
        expect(rows[0].slice(0, 16)).toEqual([
            "gasto",
            "2026-10-05",
            "rent",
            "Alquiler",
            "Inmobiliaria Sol SL",
            "B12345674",
            "F-118",
            1000,
            21,
            210,
            15,
            150,
            1060,
            "caja",
            "",
            "",
        ]);
        expect(rows[1].slice(7, 13)).toEqual([50, "exenta", 0, "", "", 50]);
        expect(rows[0].slice(16)).toEqual(["contabilizado", "manual", "2026-10", "e1", "Ana"]);
    });

    it("книга расходов: номер приёма по году, квартал, калификация, сторно с минусом", () => {
        const second = ledgerEntry({ id: "e2", occurredOn: "2026-11-02" });
        const storno = ledgerEntry({
            id: "e3",
            occurredOn: "2026-11-03",
            reversalOfId: "e2",
            sourceType: "reversal",
            secret: reversedSecret(second.secret),
        });
        const receptions = receptionNumbers([invoice, second, storno]);
        expect([...receptions.values()]).toEqual(["2026-0001", "2026-0002", "2026-0003"]);
        const rows = bookRows("purchases", [second, storno], context, receptions);
        expect(rows[0].slice(0, 3)).toEqual([2026, "4T", "2026-0002"]);
        expect(rows[1].slice(9, 16)).toEqual(["S", -100, 21, -21, "", "", -121]);
    });

    it("книга доходов без номера приёма; концепт проводки заказа — статья и номер заказа", () => {
        const sale = ledgerEntry({
            id: "s1",
            direction: LedgerDirection.income,
            categoryId: "rent",
            secret: { description: null, sourceLabel: "A-0012" },
        });
        const [row] = bookRows("sales", [sale], context, new Map());
        expect(row).toHaveLength(17);
        expect(row[7]).toBe("Arrendamientos · Pedido A-0012");
    });
});
