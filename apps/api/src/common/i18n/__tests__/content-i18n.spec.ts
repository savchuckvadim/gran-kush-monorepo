import { DEFAULT_CONTENT_LOCALE } from "../content-locale";
import { parseRequestLocale } from "../parse-request-locale";
import { resolveLabel } from "../resolve-label";

describe("parseRequestLocale", () => {
    it.each([
        ["es", "es"],
        ["ru", "ru"],
        ["en", "en"],
        ["ru-RU,ru;q=0.9,en;q=0.8", "ru"],
        ["es-ES", "es"],
        ["EN-gb", "en"],
        ["  en ; q=1", "en"],
    ])("%s → %s", (header, expected) => {
        expect(parseRequestLocale(header)).toBe(expected);
    });

    it.each([
        ["без заголовка", undefined],
        ["пустой", ""],
        ["неподдерживаемый язык", "fr-FR,en;q=0.5"],
        ["звёздочка", "*"],
        ["мусор", ";;,,"],
    ])("%s → язык по умолчанию", (_, header) => {
        expect(parseRequestLocale(header)).toBe(DEFAULT_CONTENT_LOCALE);
    });

    it("берёт первое значение массива заголовков", () => {
        expect(parseRequestLocale(["ru", "en"])).toBe("ru");
    });

    it("по умолчанию испанский", () => {
        expect(DEFAULT_CONTENT_LOCALE).toBe("es");
    });
});

describe("resolveLabel", () => {
    const labelI18n = { es: "Nombre", ru: "Имя", en: "First name" };

    it("перевод на язык запроса", () => {
        expect(resolveLabel({ label: "First name", labelI18n }, "es")).toBe("Nombre");
        expect(resolveLabel({ label: "First name", labelI18n }, "ru")).toBe("Имя");
        expect(resolveLabel({ label: "First name", labelI18n }, "en")).toBe("First name");
    });

    it("переименование клубом выигрывает у перевода", () => {
        expect(
            resolveLabel({ label: "First name", labelI18n, labelOverride: "Nombre de pila" }, "ru")
        ).toBe("Nombre de pila");
    });

    it("пустое переименование не считается", () => {
        expect(resolveLabel({ label: "First name", labelI18n, labelOverride: "  " }, "es")).toBe(
            "Nombre"
        );
        expect(resolveLabel({ label: "First name", labelI18n, labelOverride: null }, "es")).toBe(
            "Nombre"
        );
    });

    it("без перевода на этот язык — базовая подпись", () => {
        expect(resolveLabel({ label: "Phone", labelI18n: { ru: "Телефон" } }, "es")).toBe("Phone");
        expect(resolveLabel({ label: "Phone", labelI18n: { es: "" } }, "es")).toBe("Phone");
        expect(resolveLabel({ label: "Phone" }, "ru")).toBe("Phone");
    });

    it.each([
        ["null", null],
        ["строка", "Nombre"],
        ["число", 42],
        ["массив", ["Nombre"]],
        ["значение не строка", { es: 1, ru: { text: "Имя" } }],
    ])("кривой labelI18n (%s) не падает и даёт базовую подпись", (_, bad) => {
        expect(resolveLabel({ label: "First name", labelI18n: bad }, "es")).toBe("First name");
    });

    it("нет ни перевода, ни подписи — null", () => {
        expect(resolveLabel({ label: null, labelI18n: null }, "es")).toBeNull();
    });
});
