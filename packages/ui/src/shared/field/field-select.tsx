"use client";

import type { ReactNode } from "react";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";

import { Field } from "./field";

/** Radix не принимает пустую строку как значение пункта — «пусто» ходит под этим ключом. */
const EMPTY = "__empty__";

const toItemValue = (value: string) => (value === "" ? EMPTY : value);
const fromItemValue = (value: string) => (value === EMPTY ? "" : value);

export interface FieldSelectOption {
    value: string;
    label: ReactNode;
    disabled?: boolean;
}

export interface FieldSelectProps {
    options: FieldSelectOption[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
    name?: string;
    id?: string;
    /** Ширина и прочее у самого триггера; по умолчанию он во всю ширину поля. */
    className?: string;
    /** Подпись для экранных читалок, когда видимого `label` нет. */
    "aria-label"?: string;
}

/**
 * Выпадающий список в стиле полей CRM (shadcn Select): заменяет нативный `<select>`,
 * чья стрелка и список берутся из ОС. Значение — строка; `""` — допустимый пункт «пусто».
 */
export function FieldSelect({
    options,
    value,
    defaultValue,
    onValueChange,
    placeholder,
    label,
    error,
    helperText,
    required,
    disabled,
    name,
    id,
    className,
    "aria-label": ariaLabel,
}: FieldSelectProps) {
    const select = (
        <Select
            value={value === undefined ? undefined : toItemValue(value)}
            defaultValue={defaultValue === undefined ? undefined : toItemValue(defaultValue)}
            onValueChange={(next) => onValueChange?.(fromItemValue(next))}
            disabled={disabled}
            name={name}
        >
            <SelectTrigger
                id={id}
                aria-label={ariaLabel}
                aria-invalid={error ? "true" : undefined}
                className={cn("w-full", className)}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent position="popper">
                {options.map((option) => (
                    <SelectItem
                        key={option.value}
                        value={toItemValue(option.value)}
                        disabled={option.disabled}
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    if (!label && !error && !helperText) {
        return select;
    }
    return (
        <Field label={label} error={error} helperText={helperText} required={required}>
            {select}
        </Field>
    );
}
