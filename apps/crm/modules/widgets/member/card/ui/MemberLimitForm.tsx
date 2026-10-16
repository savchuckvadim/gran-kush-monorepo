"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Input } from "@workspace/ui";

import { useUpdateMemberLimit } from "@/modules/entities/member-limit";

interface MemberLimitFormProps {
    memberId: string;
    personalGrams: number | null;
}

/** Личный лимит участника в граммах; «Как у клуба» возвращает лимит клуба по умолчанию. */
export function MemberLimitForm({ memberId, personalGrams }: MemberLimitFormProps) {
    const t = useTranslations("crm.members.card.limit");
    const update = useUpdateMemberLimit(memberId);
    const [value, setValue] = useState(personalGrams === null ? "" : String(personalGrams));

    const grams = value.trim() === "" ? null : Number(value);
    const invalid = grams !== null && (!Number.isFinite(grams) || grams < 0);

    return (
        <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
                event.preventDefault();
                if (!invalid) update.mutate(grams);
            }}
        >
            <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">{t("personalLabel")}</span>
                <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={t("personalPlaceholder")}
                    className="w-32"
                />
            </label>
            <Button type="submit" size="sm" disabled={invalid || update.isPending}>
                {t("save")}
            </Button>
            {personalGrams !== null && (
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={update.isPending}
                    onClick={() => {
                        setValue("");
                        update.mutate(null);
                    }}
                >
                    {t("useClubDefault")}
                </Button>
            )}
            {update.error && (
                <p role="alert" className="w-full text-sm text-destructive">
                    {getApiErrorMessage(update.error)}
                </p>
            )}
        </form>
    );
}
