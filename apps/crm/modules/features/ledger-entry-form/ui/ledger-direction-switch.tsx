"use client";

import { useTranslations } from "next-intl";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";

import { Button } from "@workspace/ui";

import { LEDGER_DIRECTIONS, type LedgerDirection } from "@/modules/entities/finance";

const ICONS = { income: ArrowDownLeft, expense: ArrowUpRight, transfer: ArrowLeftRight } as const;

interface LedgerDirectionSwitchProps {
    value: LedgerDirection;
    onChange: (direction: LedgerDirection) => void;
    /** У сохранённой проводки направление не меняют */
    disabled?: boolean;
}

/** Доход, расход или перевод между своими счетами. */
export function LedgerDirectionSwitch({ value, onChange, disabled }: LedgerDirectionSwitchProps) {
    const t = useTranslations("crm.finance.directions");
    return (
        <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {LEDGER_DIRECTIONS.map((direction) => {
                const Icon = ICONS[direction];
                const active = direction === value;
                return (
                    <Button
                        key={direction}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        variant={active ? "default" : "ghost"}
                        size="sm"
                        disabled={disabled && !active}
                        onClick={() => onChange(direction)}
                    >
                        <Icon aria-hidden="true" />
                        {t(direction)}
                    </Button>
                );
            })}
        </div>
    );
}
