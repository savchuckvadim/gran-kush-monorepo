"use client";

import { type EntityRecord } from "@/modules/entities/entity-records";

import { recordTitle } from "./record-display";
import { StageSelect, type EntityStage } from "./stage-select";

export function RecordsKanban({
    records,
    stages,
    onEdit,
    onStageChange,
}: {
    records: EntityRecord[];
    stages: EntityStage[];
    onEdit: (record: EntityRecord) => void;
    onStageChange: (record: EntityRecord, stageId: string) => void;
}) {
    return (
        <div className="flex gap-3 overflow-x-auto pb-2">
            {[{ id: "", name: "Без стадии" }, ...stages].map((stage) => {
                const columnRecords = records.filter((record) =>
                    stage.id ? record.stage?.id === stage.id : !record.stage
                );
                return (
                    <div
                        key={stage.id || "none"}
                        className="w-64 shrink-0 rounded-lg border bg-muted/20 p-2"
                    >
                        <p className="mb-2 px-1 text-sm font-medium">
                            {stage.name}{" "}
                            <span className="text-xs text-muted-foreground">
                                ({columnRecords.length})
                            </span>
                        </p>
                        <div className="space-y-2">
                            {columnRecords.map((record) => (
                                <div
                                    key={record.id}
                                    className="rounded-md border bg-background p-2 text-sm"
                                >
                                    <button
                                        type="button"
                                        className="block text-left font-medium hover:underline"
                                        onClick={() => onEdit(record)}
                                    >
                                        {recordTitle(record)}
                                    </button>
                                    {stages.length > 0 ? (
                                        <StageSelect
                                            className="mt-2 h-7 w-full rounded border border-input bg-background px-1 text-xs"
                                            stages={stages}
                                            value={record.stage?.id ?? ""}
                                            onChange={(stageId) =>
                                                onStageChange(record, stageId)
                                            }
                                        />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
