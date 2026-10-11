"use client";

import { type ComponentProps, useId } from "react";
import { useTranslations } from "next-intl";

import type { UseFormRegisterReturn } from "react-hook-form";

import { Button, Field, FieldInput, Label, Switch } from "@workspace/ui";

import { PLAN_INTERVALS } from "@/modules/entities/billing";

const SELECT_CLASS_NAME =
    "h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60";

export function SelectField({
    label,
    error,
    helperText,
    children,
    ...props
}: ComponentProps<"select"> & { label: string; error?: string; helperText?: string }) {
    return (
        <Field label={label} error={error} helperText={helperText}>
            <select
                className={SELECT_CLASS_NAME}
                aria-invalid={error ? true : undefined}
                {...props}
            >
                {children}
            </select>
        </Field>
    );
}

export function SwitchField({
    label,
    checked,
    onCheckedChange,
}: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    const id = useId();
    return (
        <div className="flex items-center gap-3">
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
            <Label htmlFor={id} className="font-normal">
                {label}
            </Label>
        </div>
    );
}

export function ToggleGroup<T extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}) {
    return (
        <Field label={label}>
            <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <Button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={option.value === value}
                        variant={option.value === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
        </Field>
    );
}

/** Сумма, валюта и период тарифа без Stripe. */
export function ManualPriceFields({
    priceAmount,
    currency,
    interval,
    errors,
}: {
    priceAmount: UseFormRegisterReturn;
    currency: UseFormRegisterReturn;
    interval: UseFormRegisterReturn;
    errors: { priceAmount?: string; currency?: string; interval?: string };
}) {
    const t = useTranslations("billing.plans.form");
    return (
        <div className="grid gap-4 sm:grid-cols-3">
            <FieldInput
                label={t("priceAmount")}
                helperText={t("priceAmountHint")}
                error={errors.priceAmount}
                inputMode="decimal"
                placeholder="49.00"
                required
                {...priceAmount}
            />
            <FieldInput
                label={t("currency")}
                error={errors.currency}
                maxLength={3}
                placeholder="EUR"
                required
                {...currency}
            />
            <SelectField label={t("interval")} error={errors.interval} {...interval}>
                {PLAN_INTERVALS.map((value) => (
                    <option key={value} value={value}>
                        {t(value === "month" ? "intervalMonth" : "intervalYear")}
                    </option>
                ))}
            </SelectField>
        </div>
    );
}
