import { FinanceAccount, TaxTreatment } from "@prisma/client";

import { columnOfHeader } from "../domain/import/import-columns";
import {
    parseAccount,
    parseAmount,
    parseDate,
    parseDirection,
    parseRate,
} from "../domain/import/import-values";

describe("значения ячеек импорта", () => {
    it("дата: ISO, испанская день/месяц/год, ячейка-дата и серийный номер Excel", () => {
        expect(parseDate("2026-10-05")).toBe("2026-10-05");
        expect(parseDate("05/10/2026")).toBe("2026-10-05");
        expect(parseDate("5.10.26")).toBe("2026-10-05");
        expect(parseDate(new Date(Date.UTC(2026, 9, 5)))).toBe("2026-10-05");
        expect(parseDate(46300)).toBe("2026-10-05");
        expect(parseDate("2026-02-30")).toBeNull();
        expect(parseDate("31/02/2026")).toBeNull();
        expect(parseDate("mañana")).toBeNull();
        expect(parseDate(12)).toBeNull();
    });

    it("сумма: точка или запятая — последний разделитель десятичный, евро не мешает", () => {
        expect(parseAmount("1.234,56")).toBe(123456);
        expect(parseAmount("1,234.56")).toBe(123456);
        expect(parseAmount("1234,5")).toBe(123450);
        expect(parseAmount("1000")).toBe(100000);
        expect(parseAmount("1 000,00 €")).toBe(100000);
        expect(parseAmount(12.34)).toBe(1234);
        expect(parseAmount("-50,00")).toBe(-5000);
        expect(parseAmount("doce")).toBeNull();
        expect(parseAmount(null)).toBeNull();
    });

    it("ставка: проценты, процентная ячейка Excel, слова режима; пусто — 0 %", () => {
        expect(parseRate("21")).toEqual({ percent: 21, treatment: TaxTreatment.taxable });
        expect(parseRate("10,5%")).toEqual({ percent: 10.5, treatment: TaxTreatment.taxable });
        expect(parseRate(0.21)).toEqual({ percent: 21, treatment: TaxTreatment.taxable });
        expect(parseRate(null)).toEqual({ percent: 0, treatment: TaxTreatment.taxable });
        expect(parseRate("Exenta")).toEqual({ percent: 0, treatment: TaxTreatment.exempt });
        expect(parseRate("no sujeta")).toEqual({ percent: 0, treatment: TaxTreatment.not_subject });
        expect(parseRate("120")).toBeNull();
        expect(parseRate("mucho")).toBeNull();
    });

    it("тип и счёт — испанскими и английскими словами, регистр и акценты не важны", () => {
        expect(parseDirection("Gasto")).toBe("expense");
        expect(parseDirection("ingreso")).toBe("income");
        expect(parseDirection("traspaso")).toBeNull();
        expect(parseAccount("Caja")).toBe(FinanceAccount.cash);
        expect(parseAccount("metálico")).toBe(FinanceAccount.cash);
        expect(parseAccount("transferencia")).toBe(FinanceAccount.bank);
        expect(parseAccount("TPV")).toBe(FinanceAccount.card);
        expect(parseAccount("bitcoin")).toBeNull();
    });

    it("заголовок: «Categoría», «IVA %», «Fecha pago» и синонимы находят колонку", () => {
        expect(columnOfHeader("Categoría")).toBe("categoria");
        expect(columnOfHeader("IVA %")).toBe("iva_pct");
        expect(columnOfHeader("IRPF %")).toBe("irpf_pct");
        expect(columnOfHeader(" Fecha pago ")).toBe("fecha_pago");
        expect(columnOfHeader("Proveedor")).toBe("contraparte");
        expect(columnOfHeader("Base imponible")).toBe("base");
        expect(columnOfHeader("Cuota IVA")).toBe("iva");
        expect(columnOfHeader("Color")).toBeNull();
    });
});
