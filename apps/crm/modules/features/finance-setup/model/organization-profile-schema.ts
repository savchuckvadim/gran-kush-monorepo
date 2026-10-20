import { z } from "zod";

import type { OrganizationProfile, OrganizationProfileInput } from "@/modules/entities/finance";

/*
 * Форма профиля организации. Сообщения ошибок — ключи `crm.finance.profile.errors.*`; номера
 * (NIF/CIF/NIE, IBAN) по контрольному знаку проверяет API и отвечает кодом поля.
 */

const optionalText = (max: number) => z.string().trim().max(max, "tooLong");
const optionalEmail = z
    .string()
    .trim()
    .max(200, "tooLong")
    .refine((value) => value === "" || z.string().email().safeParse(value).success, "email");

export const organizationProfileSchema = z.object({
    legalForm: z.enum(["association", "self_employed", "limited_company", "other"]),
    vatRegime: z.enum(["general", "exempt", "equivalence_surcharge"]),
    incomeTaxRegime: z.enum([
        "corporate_partially_exempt",
        "corporate",
        "irpf_direct_simplified",
        "irpf_direct_normal",
        "irpf_objective",
    ]),
    pricesIncludeTax: z.boolean(),
    fiscalYearStartMonth: z.number().int().min(1).max(12),
    legalName: z.string().trim().min(2, "required").max(200, "tooLong"),
    tradeName: optionalText(200),
    taxId: optionalText(20),
    addressLine: optionalText(300),
    postalCode: optionalText(12),
    city: optionalText(120),
    province: optionalText(120),
    iban: optionalText(42),
    email: optionalEmail,
    phone: optionalText(40),
    gestorName: optionalText(200),
    gestorEmail: optionalEmail,
    gestorPhone: optionalText(40),
});

export type OrganizationProfileValues = z.infer<typeof organizationProfileSchema>;

const text = (value: string | null | undefined): string => value ?? "";
const nullable = (value: string): string | null => (value === "" ? null : value);

/** Значения формы из профиля: пустые реквизиты — пустые строки. */
export const valuesFromProfile = (profile: OrganizationProfile): OrganizationProfileValues => ({
    legalForm: profile.legalForm,
    vatRegime: profile.vatRegime,
    incomeTaxRegime: profile.incomeTaxRegime,
    pricesIncludeTax: profile.pricesIncludeTax,
    fiscalYearStartMonth: profile.fiscalYearStartMonth,
    legalName: text(profile.legalName),
    tradeName: text(profile.tradeName),
    taxId: text(profile.taxId),
    addressLine: text(profile.addressLine),
    postalCode: text(profile.postalCode),
    city: text(profile.city),
    province: text(profile.province),
    iban: text(profile.iban),
    email: text(profile.email),
    phone: text(profile.phone),
    gestorName: text(profile.gestorName),
    gestorEmail: text(profile.gestorEmail),
    gestorPhone: text(profile.gestorPhone),
});

/** Запрос API из формы: пустые строки — `null`. */
export const inputFromValues = (values: OrganizationProfileValues): OrganizationProfileInput => ({
    legalForm: values.legalForm,
    vatRegime: values.vatRegime,
    incomeTaxRegime: values.incomeTaxRegime,
    pricesIncludeTax: values.pricesIncludeTax,
    fiscalYearStartMonth: values.fiscalYearStartMonth,
    legalName: values.legalName,
    tradeName: nullable(values.tradeName),
    taxId: nullable(values.taxId),
    addressLine: nullable(values.addressLine),
    postalCode: nullable(values.postalCode),
    city: nullable(values.city),
    province: nullable(values.province),
    iban: nullable(values.iban),
    email: nullable(values.email),
    phone: nullable(values.phone),
    gestorName: nullable(values.gestorName),
    gestorEmail: nullable(values.gestorEmail),
    gestorPhone: nullable(values.gestorPhone),
});
