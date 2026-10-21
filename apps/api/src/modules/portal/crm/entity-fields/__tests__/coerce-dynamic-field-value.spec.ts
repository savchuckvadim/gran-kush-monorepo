import { BadRequestException } from "@nestjs/common";

import { PortalFieldType } from "@prisma/client";

import {
    coerceDynamicFieldValue,
    type DynamicFieldRules,
} from "../application/services/coerce-dynamic-field-value";
import { DYNAMIC_FIELD_LIMITS } from "../constants/dynamic-field-limits";

const plain: DynamicFieldRules = { options: [], isMultiple: false, validationJson: null };
const withOptions = (...keys: string[]): DynamicFieldRules => ({
    ...plain,
    options: keys.map((valueKey) => ({ valueKey })),
});

const coerce = (type: PortalFieldType, raw: unknown, field: DynamicFieldRules = plain) =>
    coerceDynamicFieldValue("f", type, raw, field);

describe("coerceDynamicFieldValue", () => {
    describe("length ceilings", () => {
        it("caps string at the default limit even without a field rule", () => {
            const atLimit = "a".repeat(DYNAMIC_FIELD_LIMITS.stringMaxLength);
            expect(coerce(PortalFieldType.string, atLimit)).toBe(atLimit);
            expect(() => coerce(PortalFieldType.string, `${atLimit}a`)).toThrow(
                BadRequestException
            );
        });

        it("lets text be longer than string but not unbounded", () => {
            const long = "a".repeat(DYNAMIC_FIELD_LIMITS.stringMaxLength + 1);
            expect(coerce(PortalFieldType.text, long)).toBe(long);
            const tooLong = "a".repeat(DYNAMIC_FIELD_LIMITS.textMaxLength + 1);
            expect(() => coerce(PortalFieldType.text, tooLong)).toThrow(BadRequestException);
        });

        it("a field rule may tighten the ceiling but not lift it", () => {
            const tight = { ...plain, validationJson: { maxLength: 3 } };
            expect(() => coerce(PortalFieldType.string, "abcd", tight)).toThrow(
                BadRequestException
            );
            const loose = { ...plain, validationJson: { maxLength: 1_000_000 } };
            const overDefault = "a".repeat(DYNAMIC_FIELD_LIMITS.stringMaxLength + 1);
            expect(() => coerce(PortalFieldType.string, overDefault, loose)).toThrow(
                BadRequestException
            );
        });
    });

    describe("document and signature", () => {
        it("keeps only the account marker", () => {
            expect(coerce(PortalFieldType.document, true)).toEqual({ fromAccount: true });
            expect(coerce(PortalFieldType.signature, { fromAccount: false })).toEqual({
                fromAccount: false,
            });
        });

        it("rejects any other object", () => {
            expect(() =>
                coerce(PortalFieldType.document, { fromAccount: true, payload: "x".repeat(10) })
            ).toThrow(BadRequestException);
            expect(() => coerce(PortalFieldType.document, { anything: 1 })).toThrow(
                BadRequestException
            );
            expect(() => coerce(PortalFieldType.signature, [true])).toThrow(BadRequestException);
        });
    });

    describe("url", () => {
        it("accepts web links", () => {
            expect(coerce(PortalFieldType.url, "https://paf-paf.app/es")).toBe(
                "https://paf-paf.app/es"
            );
        });

        it("rejects scripts, other schemes and garbage", () => {
            for (const value of ["javascript:alert(1)", "data:text/html,x", "ftp://x.y", "nope"]) {
                expect(() => coerce(PortalFieldType.url, value)).toThrow(BadRequestException);
            }
        });
    });

    describe("selects and relations", () => {
        it("checks options when the field has them", () => {
            expect(coerce(PortalFieldType.single_select, "a", withOptions("a", "b"))).toBe("a");
            expect(() => coerce(PortalFieldType.single_select, "c", withOptions("a"))).toThrow(
                BadRequestException
            );
        });

        it("bounds the value when the field has no options", () => {
            const tooLong = "r".repeat(DYNAMIC_FIELD_LIMITS.stringMaxLength + 1);
            expect(() => coerce(PortalFieldType.relation, tooLong)).toThrow(BadRequestException);
        });

        it("caps the number of multi-select values", () => {
            const many = Array.from(
                { length: DYNAMIC_FIELD_LIMITS.multipleMaxItems + 1 },
                () => "x"
            );
            expect(() => coerce(PortalFieldType.multi_select, many)).toThrow(BadRequestException);
            expect(coerce(PortalFieldType.multi_select, ["x", "y"])).toEqual(["x", "y"]);
        });
    });

    describe("numbers", () => {
        it("rejects infinite decimals and unsafe integers", () => {
            expect(() => coerce(PortalFieldType.decimal, Infinity)).toThrow(BadRequestException);
            expect(() => coerce(PortalFieldType.int, 2 ** 60)).toThrow(BadRequestException);
            expect(coerce(PortalFieldType.int, "42")).toBe(42);
        });
    });

    it("normalizes email and bounds its length", () => {
        expect(coerce(PortalFieldType.email, " Ana@Club.ES ")).toBe("ana@club.es");
        const long = `${"a".repeat(DYNAMIC_FIELD_LIMITS.emailMaxLength)}@x.es`;
        expect(() => coerce(PortalFieldType.email, long)).toThrow(BadRequestException);
    });
});
