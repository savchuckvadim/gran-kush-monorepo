"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button, Input } from "@workspace/ui";

interface LimitDefaultRowProps {
    grams: number | null;
    disabled: boolean;
    onSave: (grams: number | null) => void;
}

/** Лимит клуба по умолчанию в граммах; пусто — без лимита у тех, кому не задан личный. */
export function LimitDefaultRow({ grams, disabled, onSave }: LimitDefaultRowProps) {
    const t = useTranslations("crm.clubPolicy.monthlyLimit");
    const [value, setValue] = useState(grams === null ? "" : String(grams));

    const next = value.trim() === "" ? null : Number(value);
    const invalid = next !== null && (!Number.isFinite(next) || next < 0);

    return (
        <li className="px-4 py-3">
            <form
                className="flex flex-wrap items-end justify-between gap-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!invalid) onSave(next);
                }}
            >
                <label className="grid min-w-0 gap-1">
                    <span className="font-medium">{t("defaultTitle")}</span>
                    <span className="text-sm text-muted-foreground">{t("defaultDescription")}</span>
                    <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={value}
                        disabled={disabled}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder={t("defaultPlaceholder")}
                        className="mt-1 w-40"
                    />
                </label>
                <Button type="submit" size="sm" disabled={disabled || invalid || next === grams}>
                    {t("save")}
                </Button>
            </form>
        </li>
    );
}
