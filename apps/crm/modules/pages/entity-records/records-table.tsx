"use client";

import { Trash2 } from "lucide-react";

import { Button, Card } from "@workspace/ui";

import { type EntityRecord } from "@/modules/entities/entity-records";

import { recordTitle, renderValue } from "./record-display";
import { StageSelect, type EntityStage } from "./stage-select";

export function RecordsTable({
    records,
    stages,
    onEdit,
    onDelete,
    onStageChange,
}: {
    records: EntityRecord[];
    stages: EntityStage[];
    onEdit: (record: EntityRecord) => void;
    onDelete: (record: EntityRecord) => void;
    onStageChange: (record: EntityRecord, stageId: string) => void;
}) {
    return (
        <Card className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                            <th className="px-3 py-2">Запись</th>
                            <th className="px-3 py-2">Стадия</th>
                            <th className="px-3 py-2">Поля</th>
                            <th className="px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record) => (
                            <tr key={record.id} className="border-b align-top last:border-b-0">
                                <td className="px-3 py-2 font-medium">
                                    {recordTitle(record)}
                                </td>
                                <td className="px-3 py-2">
                                    {stages.length > 0 ? (
                                        <StageSelect
                                            className="h-8 rounded border border-input bg-background px-1.5 text-xs"
                                            stages={stages}
                                            value={record.stage?.id ?? ""}
                                            onChange={(stageId) =>
                                                onStageChange(record, stageId)
                                            }
                                        />
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            {record.stage?.name ?? "—"}
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">
                                    {record.fields.slice(0, 4).map((field) => (
                                        <span key={field.fieldKey} className="mr-3">
                                            <span className="font-mono">
                                                {field.fieldKey}
                                            </span>
                                            : {renderValue(field.value as unknown)}
                                        </span>
                                    ))}
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => onEdit(record)}
                                        >
                                            Открыть
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => onDelete(record)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {records.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                                >
                                    Записей нет
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
