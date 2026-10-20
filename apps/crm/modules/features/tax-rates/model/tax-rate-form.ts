import { z } from "zod";

import type { TaxRate, TaxRateChange, TaxRateInput } from "@/modules/entities/finance";

/** Сообщения — ключи `crm.finance.taxRates.errors.*`. */
const hasCents = (value: number) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

/** У пресета имя необязательно (подпись по коду), у своей ставки — обязательно. */
export const taxRateFormSchema = (isPreset: boolean) =>
    z.object({
        name: z
            .string()
            .trim()
            .max(80, "tooLong")
            .refine((value) => isPreset || value.length > 0, "required"),
        percent: z
            .number({ message: "percent" })
            .min(0, "percent")
            .max(100, "percent")
            .refine(hasCents, "percent"),
        treatment: z.enum(["taxable", "exempt", "not_subject"]),
    });

export type TaxRateFormValues = z.infer<ReturnType<typeof taxRateFormSchema>>;

export const taxRateFormValues = (rate?: TaxRate): TaxRateFormValues => ({
    name: rate?.name ?? "",
    percent: rate?.percent ?? 0,
    treatment: rate?.treatment ?? "taxable",
});

/** Новая ставка: у exenta и no sujeta процент 0 (так же решает API). */
export const toTaxRateInput = (values: TaxRateFormValues): TaxRateInput => ({
    name: values.name,
    percent: values.treatment === "taxable" ? values.percent : 0,
    treatment: values.treatment,
});

/** Правка: пустое имя пресета — вернуть подпись по коду. */
export const toTaxRateChange = (values: TaxRateFormValues): TaxRateChange => ({
    name: values.name === "" ? null : values.name,
    percent: values.treatment === "taxable" ? values.percent : 0,
    treatment: values.treatment,
});
