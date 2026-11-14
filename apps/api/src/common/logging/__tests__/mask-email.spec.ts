import { maskEmail, maskEmails } from "../mask-email";

describe("maskEmail", () => {
    it("оставляет первый символ и домен", () => {
        expect(maskEmail("member@club.es")).toBe("m***@club.es");
    });

    it("строка без локальной части или без @ не утекает целиком", () => {
        expect(maskEmail("@club.es")).toBe("***");
        expect(maskEmail("not-an-email")).toBe("***");
    });

    it("список адресатов", () => {
        expect(maskEmails(["a@x.es", "bob@y.es"])).toBe("a***@x.es, b***@y.es");
    });
});
