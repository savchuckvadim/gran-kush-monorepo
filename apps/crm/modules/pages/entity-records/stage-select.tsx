"use client";

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
        <select
            className={className}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">— без стадии —</option>
            {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                    {stage.name}
                </option>
            ))}
        </select>
    );
}
