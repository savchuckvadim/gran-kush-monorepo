"use client";

import { useTranslations } from "next-intl";

import type { UseFormReturn } from "react-hook-form";

import { FieldInput } from "@workspace/ui";

import type { OrganizationProfileValues } from "../model/organization-profile-schema";

type TextField = Exclude<
    keyof OrganizationProfileValues,
    "legalForm" | "vatRegime" | "incomeTaxRegime" | "pricesIncludeTax" | "fiscalYearStartMonth"
>;

export interface OrganizationTextFieldSpec {
    name: TextField;
    type?: "text" | "email" | "tel";
    autoComplete?: string;
    /** Поле во всю ширину сетки */
    wide?: boolean;
    required?: boolean;
}

interface OrganizationTextFieldsProps {
    form: UseFormReturn<OrganizationProfileValues>;
    fields: readonly OrganizationTextFieldSpec[];
    disabled: boolean;
    /** Подсказка под полем по его имени (например, какой номер ждут для формы организации) */
    hint?: (name: TextField) => string | undefined;
}

/** Текстовые реквизиты сеткой: подпись и ошибка — из `crm.finance.profile.fields.*` и `errors.*`. */
export function OrganizationTextFields({
    form,
    fields,
    disabled,
    hint,
}: OrganizationTextFieldsProps) {
    const t = useTranslations("crm.finance.profile");
    const { errors } = form.formState;

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ name, type = "text", autoComplete, wide, required }) => {
                const message = errors[name]?.message;
                return (
                    <div key={name} className={wide ? "sm:col-span-2" : undefined}>
                        <FieldInput
                            id={`org-${name}`}
                            label={t(`fields.${name}`)}
                            type={type}
                            autoComplete={autoComplete}
                            required={required}
                            disabled={disabled}
                            error={message ? t(`errors.${message}`) : undefined}
                            helperText={hint?.(name)}
                            {...form.register(name)}
                        />
                    </div>
                );
            })}
        </div>
    );
}
