import { parseTaxId } from "../domain/ledger/counterparty";

describe("налоговый номер контрагента", () => {
    it("испанский проверяется по контрольному знаку; префикс ES снимается", () => {
        expect(parseTaxId("b-1234567.4")).toEqual({ value: "B12345674", country: "ES" });
        expect(parseTaxId("ESB12345674")).toEqual({ value: "B12345674", country: "ES" });
        expect(parseTaxId("12345678Z")).toEqual({ value: "12345678Z", country: "ES" });
        expect(parseTaxId("12345678A")).toBeNull();
        expect(parseTaxId("B12345675")).toBeNull();
    });

    it("номер с префиксом страны ЕС — иностранный поставщик без испанской проверки", () => {
        expect(parseTaxId("DE123456789")).toEqual({ value: "DE123456789", country: "DE" });
        expect(parseTaxId("FR 12 345678901")).toEqual({ value: "FR12345678901", country: "FR" });
    });

    it("страна из формы важнее префикса; мусор не проходит", () => {
        expect(parseTaxId("123456789", "US")).toEqual({ value: "123456789", country: "US" });
        expect(parseTaxId("123456789", "ES")).toBeNull();
        expect(parseTaxId("?")).toBeNull();
    });
});
