import { InputHTMLAttributes, ReactNode } from "react";

import {
    Field as UIField,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

export interface FieldProps {
    label?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    children?: ReactNode;
    className?: string;
}

export function Field({ label, error, helperText, required, children, className }: FieldProps) {
    return (
        <UIField className={cn(className)} data-invalid={error ? "true" : undefined}>
            {label && (
                <FieldLabel>
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </FieldLabel>
            )}
            <FieldContent>
                {children}
                {helperText && !error && <FieldDescription>{helperText}</FieldDescription>}
                {error && <FieldError>{error}</FieldError>}
            </FieldContent>
        </UIField>
    );
}

export interface FieldInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
}

export function FieldInput({
    label,
    error,
    helperText,
    required,
    className,
    ...inputProps
}: FieldInputProps) {
    return (
        <Field label={label} error={error} helperText={helperText} required={required}>
            <Input
                className={cn(error && "border-destructive", className)}
                aria-invalid={error ? "true" : undefined}
                {...inputProps}
            />
        </Field>
    );
}
