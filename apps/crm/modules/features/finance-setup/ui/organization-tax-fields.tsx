"use client";

import { useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Controller, type UseFormReturn, useWatch } from "react-hook-form";

import { Field, FieldSelect, Switch } from "@workspace/ui";

import { INCOME_TAX_REGIMES_BY_FORM, LEGAL_FORMS, VAT_REGIMES } from "@/modules/entities/finance";

import type { OrganizationProfileValues } from "../model/organization-profile-schema";

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));

/** Названия месяцев на языке интерфейса, с заглавной: «Январь», «Enero», «January». */
const useMonthName = () => {
    const locale = useLocale();
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
        return (month: string) => {
            const name = format.format(new Date(Date.UTC(2000, Number(month) - 1, 1)));
            return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
        };
    }, [locale]);
};

interface OrganizationTaxFieldsProps {
    form: UseFormReturn<OrganizationProfileValues>;
    disabled: boolean;
}

/**
 * Форма организации и налоги. Режим налога на прибыль зависит от формы: у asociación — IS, у
 * autónomo — IRPF; при смене формы режим, которого у неё нет, заменяется режимом по умолчанию.
 * У autónomo год всегда календарный (так же решает API).
 */
export function OrganizationTaxFields({ form, disabled }: OrganizationTaxFieldsProps) {
    const t = useTranslations("crm.finance.profile");
    const monthName = useMonthName();
    const legalForm = useWatch({ control: form.control, name: "legalForm" });
    const regimes = INCOME_TAX_REGIMES_BY_FORM[legalForm];
    const calendarYear = legalForm === "self_employed";

    useEffect(() => {
        const fallback = regimes[0];
        if (fallback && !regimes.includes(form.getValues("incomeTaxRegime"))) {
            form.setValue("incomeTaxRegime", fallback, { shouldDirty: true });
        }
        if (calendarYear && form.getValues("fiscalYearStartMonth") !== 1) {
            form.setValue("fiscalYearStartMonth", 1, { shouldDirty: true });
        }
    }, [form, regimes, calendarYear]);

    const incomeTaxError = form.formState.errors.incomeTaxRegime?.message;
    const options = (codes: readonly string[], label: (code: string) => string) =>
        codes.map((code) => ({ value: code, label: label(code) }));

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Controller
                control={form.control}
                name="legalForm"
                render={({ field }) => (
                    <FieldSelect
                        id="org-legal-form"
                        label={t("legalForm.label")}
                        helperText={t(`legalForm.hint.${field.value}`)}
                        value={field.value}
                        options={options(LEGAL_FORMS, (code) => t(`legalForm.options.${code}`))}
                        onValueChange={field.onChange}
                        disabled={disabled}
                    />
                )}
            />
            <Controller
                control={form.control}
                name="incomeTaxRegime"
                render={({ field }) => (
                    <FieldSelect
                        id="org-income-tax"
                        label={t("incomeTax.label")}
                        helperText={t(`incomeTax.hint.${field.value}`)}
                        value={field.value}
                        options={options(regimes, (code) => t(`incomeTax.options.${code}`))}
                        onValueChange={field.onChange}
                        error={incomeTaxError ? t(`errors.${incomeTaxError}`) : undefined}
                        disabled={disabled}
                    />
                )}
            />
            <Controller
                control={form.control}
                name="vatRegime"
                render={({ field }) => (
                    <FieldSelect
                        id="org-vat"
                        label={t("vat.label")}
                        helperText={t(`vat.hint.${field.value}`)}
                        value={field.value}
                        options={options(VAT_REGIMES, (code) => t(`vat.options.${code}`))}
                        onValueChange={field.onChange}
                        disabled={disabled}
                    />
                )}
            />
            <Controller
                control={form.control}
                name="fiscalYearStartMonth"
                render={({ field }) => (
                    <FieldSelect
                        id="org-fiscal-year"
                        label={t("fiscalYear.label")}
                        helperText={
                            calendarYear ? t("fiscalYear.calendarOnly") : t("fiscalYear.hint")
                        }
                        value={String(field.value)}
                        options={options(MONTHS, monthName)}
                        onValueChange={(month) => field.onChange(Number(month))}
                        disabled={disabled || calendarYear}
                    />
                )}
            />
            <Controller
                control={form.control}
                name="pricesIncludeTax"
                render={({ field }) => (
                    <Field
                        label={t("pricesIncludeTax.label")}
                        helperText={t("pricesIncludeTax.hint")}
                        className="sm:col-span-2"
                    >
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={disabled}
                            aria-label={t("pricesIncludeTax.label")}
                        />
                    </Field>
                )}
            />
        </div>
    );
}
