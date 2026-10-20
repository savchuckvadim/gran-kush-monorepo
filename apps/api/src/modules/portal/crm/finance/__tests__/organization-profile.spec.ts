import { IncomeTaxRegime, LegalForm, PortalTypeEnum, VatRegime } from "@prisma/client";

import { isValidIban } from "@modules/portal/crm/finance/domain/organization/iban";
import {
    EMPTY_IDENTITY,
    fiscalYearStartFor,
    presetForPortalType,
} from "@modules/portal/crm/finance/domain/organization/organization-profile";
import {
    ORGANIZATION_ERRORS,
    validateOrganization,
} from "@modules/portal/crm/finance/domain/organization/organization-validation";
import {
    cifEntityLetter,
    classifySpanishTaxId,
} from "@modules/portal/crm/finance/domain/organization/spanish-tax-id";

describe("испанские налоговые номера", () => {
    it.each([
        ["12345678Z", "nif"],
        ["12.345.678-z", "nif"],
        ["X1234567L", "nie"],
        ["B12345674", "cif"],
        ["G12345674", "cif"],
        ["P1234567D", "cif"],
    ])("%s — %s", (value, kind) => {
        expect(classifySpanishTaxId(value)).toBe(kind);
    });

    it.each(["12345678A", "X1234567A", "B12345675", "P12345674", "Z12", ""])(
        "%s — не номер",
        (value) => {
            expect(classifySpanishTaxId(value)).toBeNull();
        }
    );

    it("буква CIF — форма юрлица", () => {
        expect(cifEntityLetter("G12345674")).toBe("G");
        expect(cifEntityLetter("12345678Z")).toBeNull();
    });
});

describe("IBAN", () => {
    it("проверяет контрольную сумму и длину страны", () => {
        expect(isValidIban("ES91 2100 0418 4502 0005 1332")).toBe(true);
        expect(isValidIban("ES9121000418450200051333")).toBe(false);
        expect(isValidIban("ES912100041845020005133")).toBe(false);
        expect(isValidIban("not an iban")).toBe(false);
    });
});

describe("профиль организации", () => {
    const identity = (over: Partial<typeof EMPTY_IDENTITY>) => ({
        ...EMPTY_IDENTITY,
        legalName: "Org",
        ...over,
    });
    const association = {
        legalForm: LegalForm.association,
        incomeTaxRegime: IncomeTaxRegime.corporate_partially_exempt,
    };

    it("пресет: клуб — asociación, студии — autónomo в estimación directa simplificada", () => {
        expect(presetForPortalType(PortalTypeEnum.CLUB)).toMatchObject({
            legalForm: LegalForm.association,
            vatRegime: VatRegime.general,
            incomeTaxRegime: IncomeTaxRegime.corporate_partially_exempt,
            pricesIncludeTax: true,
        });
        for (const type of [PortalTypeEnum.TATTOO_STUDIO, PortalTypeEnum.BEAUTY_STUDIO]) {
            expect(presetForPortalType(type)).toMatchObject({
                legalForm: LegalForm.self_employed,
                incomeTaxRegime: IncomeTaxRegime.irpf_direct_simplified,
            });
        }
    });

    it("нормализует номер, IBAN и пустые строки", () => {
        const result = validateOrganization(
            association,
            identity({ taxId: "g-12345674", iban: "es91 2100 0418 4502 0005 1332", city: "  " })
        );
        expect(result).toEqual({
            ok: true,
            identity: expect.objectContaining({
                taxId: "G12345674",
                iban: "ES9121000418450200051332",
                city: null,
            }),
        });
    });

    it("у autónomo финансовый год — календарный, у ассоциации и SL — с любого месяца", () => {
        expect(fiscalYearStartFor(LegalForm.self_employed, 7)).toBe(1);
        expect(fiscalYearStartFor(LegalForm.association, 7)).toBe(7);
        expect(fiscalYearStartFor(LegalForm.limited_company, 10)).toBe(10);
    });

    it("номер должен подходить форме: autónomo — NIF/NIE, ассоциация — CIF на G, SL — на B", () => {
        const selfEmployed = {
            legalForm: LegalForm.self_employed,
            incomeTaxRegime: IncomeTaxRegime.irpf_direct_simplified,
        };
        expect(validateOrganization(selfEmployed, identity({ taxId: "X1234567L" })).ok).toBe(true);
        expect(validateOrganization(selfEmployed, identity({ taxId: "B12345674" }))).toMatchObject({
            ok: false,
            code: ORGANIZATION_ERRORS.taxIdKindMismatch,
        });
        expect(validateOrganization(association, identity({ taxId: "B12345674" }))).toMatchObject({
            ok: false,
            code: ORGANIZATION_ERRORS.taxIdKindMismatch,
        });
        const sl = {
            legalForm: LegalForm.limited_company,
            incomeTaxRegime: IncomeTaxRegime.corporate,
        };
        expect(validateOrganization(sl, identity({ taxId: "B12345674" })).ok).toBe(true);
    });

    it("номер с ошибкой, неверный IBAN и IRPF у ассоциации — отказ с полем", () => {
        expect(validateOrganization(association, identity({ taxId: "G12345675" }))).toMatchObject({
            code: ORGANIZATION_ERRORS.invalidTaxId,
            field: "taxId",
        });
        expect(validateOrganization(association, identity({ iban: "ES00 1234" }))).toMatchObject({
            code: ORGANIZATION_ERRORS.invalidIban,
            field: "iban",
        });
        expect(
            validateOrganization(
                {
                    legalForm: LegalForm.association,
                    incomeTaxRegime: IncomeTaxRegime.irpf_direct_normal,
                },
                identity({})
            )
        ).toMatchObject({ code: ORGANIZATION_ERRORS.taxRegimeMismatch });
    });
});
