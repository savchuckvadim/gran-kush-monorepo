"use client";

import { useTranslations } from "next-intl";

import { FieldSelect } from "@workspace/ui";

interface FunnelSelectProps {
    funnels: ReadonlyArray<{ id: string; name: string }>;
    value: string;
    onChange: (funnelId: string) => void;
}

/** The funnel of a board (orders, a smart process); shown only when there are several. */
export function FunnelSelect({ funnels, value, onChange }: FunnelSelectProps) {
    const t = useTranslations("crm.board");
    if (funnels.length < 2) return null;

    return (
        <FieldSelect
            size="sm"
            aria-label={t("funnel")}
            className="w-auto min-w-40"
            options={funnels.map((funnel) => ({ value: funnel.id, label: funnel.name }))}
            value={value}
            onValueChange={onChange}
        />
    );
}
