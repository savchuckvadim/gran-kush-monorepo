"use client";

import {
    Field,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui";

interface OptionSelectProps<T extends string> {
    id: string;
    label: string;
    value: T;
    options: readonly T[];
    /** Подпись варианта по его коду */
    optionLabel: (option: T) => string;
    onChange: (value: T) => void;
    helperText?: string;
    error?: string;
    disabled?: boolean;
}

/** Поле выбора из закрытого списка кодов (форма организации, режимы налогов). */
export function OptionSelect<T extends string>({
    id,
    label,
    value,
    options,
    optionLabel,
    onChange,
    helperText,
    error,
    disabled,
}: OptionSelectProps<T>) {
    const select = (next: string) => {
        const option = options.find((item) => item === next);
        if (option) onChange(option);
    };

    return (
        <Field label={label} helperText={helperText} error={error}>
            <Select value={value} onValueChange={select} disabled={disabled}>
                <SelectTrigger id={id} aria-invalid={error ? "true" : undefined} className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {optionLabel(option)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    );
}
