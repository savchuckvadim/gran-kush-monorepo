import { randomBytes, randomUUID } from "crypto";

import { formatQrToken } from "@modules/portal/crm/qr-codes/domain/qr-token";

import { classifyScan } from "../domain/scanned-code";

describe("classifyScan — что прочитал сканер", () => {
    it("этикетка товара: префикс P- и код в любом регистре", () => {
        expect(classifyScan("P-K7M2Q9XA")).toEqual({ kind: "product", code: "K7M2Q9XA" });
        expect(classifyScan("  p-k7m2q9xa ")).toEqual({ kind: "product", code: "K7M2Q9XA" });
    });

    it("код входа участника — подписанная строка из 38 знаков", () => {
        const token = formatQrToken(randomUUID(), randomBytes(12));
        expect(classifyScan(token)).toEqual({ kind: "member", token });
    });

    it("штрихкод упаковки и код с похожими на ноль буквами — ищутся как штрихкод", () => {
        expect(classifyScan("8412345678905")).toEqual({
            kind: "barcode",
            barcode: "8412345678905",
        });
        // в алфавите этикеток нет O и 0: это не код товара
        expect(classifyScan("P-O0O0O0O0")).toEqual({ kind: "barcode", barcode: "P-O0O0O0O0" });
    });

    it("строка с пробелами, пустая или слишком длинная — не код", () => {
        expect(classifyScan("hello world")).toEqual({ kind: "unrecognized" });
        expect(classifyScan("   ")).toEqual({ kind: "unrecognized" });
        expect(classifyScan("9".repeat(65))).toEqual({ kind: "unrecognized" });
    });
});
