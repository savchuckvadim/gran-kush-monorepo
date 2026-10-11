"use client";

import { FieldSelect } from "@workspace/ui";

import { type EntityStageCategory } from "@/modules/entities/entity-settings";

export type EntityStage = EntityStageCategory["stages"][number];

export function StageSelect({
    stages,
    value,
    onChange,
    className,
}: {
    stages: EntityStage[];
    value: string;
    onChange: (stageId: string) => void;
    className?: string;
}) {
    return (
        <FieldSelect
            size="sm"
            className={className}
            aria-label="Стадия"
            options={[
                { value: "", label: "— без стадии —" },
                ...stages.map((stage) => ({ value: stage.id, label: stage.name })),
            ]}
            value={value}
            onValueChange={onChange}
        />
    );
}
