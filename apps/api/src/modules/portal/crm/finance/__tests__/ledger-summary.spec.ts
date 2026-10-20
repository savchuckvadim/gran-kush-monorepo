import { FinanceAccount, LedgerDirection, TaxTreatment } from "@prisma/client";

import { reversedSecret } from "../domain/ledger/ledger-entry";
import { accountBalances, summarize } from "../domain/ledger/ledger-summary";
import { activeSale, nextSaleSourceId } from "../domain/ledger/order-sale";
import { saleLines } from "../infrastructure/sources/order-sale-prisma.source";
import { Prisma } from "@prisma/client";

import { ledgerEntry } from "./ledger-fixtures";

const income = ledgerEntry({
    id: "sale",
    direction: LedgerDirection.income,
    categoryId: "sales",
    account: FinanceAccount.bank,
    secret: {
        lines: [
            { percent: 21, treatment: TaxTreatment.taxable, net: 10000, tax: 2100 },
            { percent: 10, treatment: TaxTreatment.taxable, net: 5000, tax: 500 },
        ],
        withholding: { percent: 15, amount: 1500 },
    },
});
const rent = ledgerEntry({ id: "rent" });
const transfer = ledgerEntry({
    id: "transfer",
    direction: LedgerDirection.transfer,
    categoryId: null,
    account: FinanceAccount.cash,
    toAccount: FinanceAccount.bank,
    secret: { lines: [{ percent: 0, treatment: null, net: 3000, tax: 0 }] },
});

describe("сводка учёта", () => {
    it("доходы и расходы по базе, налог отдельно, перевод не доход и не расход", () => {
        const summary = summarize([income, rent, transfer]);
        expect(summary.income).toEqual({
            net: 15000,
            tax: 2600,
            total: 17600,
            withholding: 1500,
            payable: 16100,
            count: 1,
        });
        expect(summary.expense).toMatchObject({ net: 10000, tax: 2100, payable: 12100, count: 1 });
        expect(summary.result).toBe(5000);
        expect(summary.byCategory.map((row) => row.categoryId)).toEqual(["sales", "rent"]);
    });

    it("сторно гасит проводку; остатки счетов — деньги к получению и к оплате, перевод двигает", () => {
        const storno = ledgerEntry({
            id: "storno",
            reversalOfId: "rent",
            secret: reversedSecret(rent.secret),
        });
        expect(summarize([rent, storno]).expense).toMatchObject({ net: 0, total: 0, count: 2 });
        const balances = accountBalances([income, rent, transfer]);
        expect(balances.get(FinanceAccount.bank)).toBe(16100 + 3000);
        expect(balances.get(FinanceAccount.cash)).toBe(-12100 - 3000);
        expect(balances.get(FinanceAccount.card)).toBe(0);
    });
});

describe("продажа по заказу", () => {
    const decimal = (value: number) => new Prisma.Decimal(value);

    it("строки по ставкам: 21 % и 10 % раздельно, подарок не входит, без снимка — без разбивки", () => {
        const lines = saleLines([
            {
                totalPrice: decimal(12.1),
                isGift: false,
                taxPercent: decimal(21),
                taxTreatment: TaxTreatment.taxable,
                netAmount: decimal(10),
                taxAmount: decimal(2.1),
            },
            {
                totalPrice: decimal(24.2),
                isGift: false,
                taxPercent: decimal(21),
                taxTreatment: TaxTreatment.taxable,
                netAmount: decimal(20),
                taxAmount: decimal(4.2),
            },
            {
                totalPrice: decimal(11),
                isGift: false,
                taxPercent: decimal(10),
                taxTreatment: TaxTreatment.taxable,
                netAmount: decimal(10),
                taxAmount: decimal(1),
            },
            {
                totalPrice: decimal(0),
                isGift: true,
                taxPercent: decimal(21),
                taxTreatment: TaxTreatment.taxable,
                netAmount: decimal(0),
                taxAmount: decimal(0),
            },
        ]);
        expect(lines).toEqual([
            { percent: 21, treatment: TaxTreatment.taxable, net: 3000, tax: 630 },
            { percent: 10, treatment: TaxTreatment.taxable, net: 1000, tax: 100 },
        ]);
        expect(
            saleLines([
                {
                    totalPrice: decimal(7.5),
                    isGift: false,
                    taxPercent: null,
                    taxTreatment: null,
                    netAmount: null,
                    taxAmount: null,
                },
            ])
        ).toEqual([{ percent: 0, treatment: null, net: 750, tax: 0 }]);
    });

    it("действующая продажа — проведённая без сторно; следующая получает новый номер", () => {
        const sale = ledgerEntry({ id: "s1", sourceType: "order_sale", sourceId: "o1#1" });
        expect(activeSale([sale])?.id).toBe("s1");
        const reversed = { ...sale, reversedById: "r1" };
        const storno = ledgerEntry({
            id: "r1",
            sourceType: "reversal",
            sourceId: "s1",
            reversalOfId: "s1",
        });
        expect(activeSale([reversed, storno])).toBeNull();
        expect(nextSaleSourceId("o1", [reversed, storno])).toBe("o1#2");
    });
});
