"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@workspace/ui";

interface QuantityStepperProps {
    value: number;
    onChange: (value: number) => void;
    /** Подпись единицы рядом с числом: «g», «ud» */
    unit?: string | null;
    decreaseLabel: string;
    increaseLabel: string;
    disabled?: boolean;
}

/** Количество целыми шагами; 0 убирает позицию из корзины. */
export function QuantityStepper({
    value,
    onChange,
    unit,
    decreaseLabel,
    increaseLabel,
    disabled,
}: QuantityStepperProps) {
    return (
        <div className="inline-flex items-center gap-1">
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label={decreaseLabel}
                disabled={disabled || value <= 0}
                onClick={() => onChange(Math.max(0, value - 1))}
            >
                <Minus aria-hidden="true" />
            </Button>
            <span
                className="min-w-12 text-center text-sm font-medium tabular-nums"
                aria-live="polite"
            >
                {value}
                {unit ? ` ${unit}` : ""}
            </span>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label={increaseLabel}
                disabled={disabled}
                onClick={() => onChange(value + 1)}
            >
                <Plus aria-hidden="true" />
            </Button>
        </div>
    );
}
