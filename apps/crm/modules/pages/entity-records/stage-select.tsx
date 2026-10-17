"use client";

import { useTranslations } from "next-intl";

import { FieldSelect } from "@workspace/ui";

import type { EntityStageCategory } from "@/modules/entities/entity-settings";

export type EntityStage = EntityStageCategory["stages"][number];

interface StageSelectProps {
    /** The stages of the funnel the record stands in */
    stages: readonly EntityStage[];
    value: string;
    onChange: (stageId: string) => void;
    className?: string;
}

/** A stage of the record's funnel picked right in a table row. */
export function StageSelect({ stages, value, onChange, className }: StageSelectProps) {
    const t = useTranslations("crm.records.table");

    return (
        <FieldSelect
            size="sm"
            className={className}
            aria-label={t("stage")}
            options={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
            value={value}
            onValueChange={onChange}
        />
    );
}
