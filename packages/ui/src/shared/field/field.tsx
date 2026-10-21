import { useState } from "react";

import { Eye, EyeOff } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";

import {
    Field as UIField,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

import { InfoHint } from "../info-hint/info-hint";

export interface FieldProps {
    label?: string;
    error?: string;
    helperText?: string;
    /** Explanation of the term behind a "?" next to the label */
    hint?: ReactNode;
    required?: boolean;
    children?: ReactNode;
    className?: string;
}

export function Field({
    label,
    error,
    helperText,
    hint,
    required,
    children,
    className,
}: FieldProps) {
    const labelText = label && (
        <FieldLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
        </FieldLabel>
    );
    return (
        <UIField className={cn(className)} data-invalid={error ? "true" : undefined}>
            {labelText && hint ? (
                <div className="flex items-center gap-1.5">
                    {labelText}
                    <InfoHint label={label}>{hint}</InfoHint>
                </div>
            ) : (
                labelText
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
    hint?: ReactNode;
    required?: boolean;
}

export function FieldInput({
    label,
    error,
    helperText,
    hint,
    required,
    className,
    ...inputProps
}: FieldInputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordField = inputProps.type === "password";
    const resolvedType = isPasswordField ? (showPassword ? "text" : "password") : inputProps.type;

    return (
        <Field label={label} error={error} helperText={helperText} hint={hint} required={required}>
            <div className="relative">
                <Input
                    className={cn(
                        error && "border-destructive",
                        isPasswordField && "pr-10",
                        className
                    )}
                    aria-invalid={error ? "true" : undefined}
                    {...inputProps}
                    type={resolvedType}
                />
                {isPasswordField && (
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                )}
            </div>
        </Field>
    );
}
