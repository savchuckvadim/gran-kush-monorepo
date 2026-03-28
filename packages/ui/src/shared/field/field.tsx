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
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordField = inputProps.type === "password";
    const resolvedType = isPasswordField ? (showPassword ? "text" : "password") : inputProps.type;

    return (
        <Field label={label} error={error} helperText={helperText} required={required}>
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
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                )}
            </div>
        </Field>
    );
}
