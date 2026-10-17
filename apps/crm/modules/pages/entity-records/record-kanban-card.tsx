"use client";

import type { EntityRecord } from "@/modules/entities/entity-records";

import { recordTitle } from "./record-display";

interface RecordKanbanCardProps {
    record: EntityRecord;
    onOpen?: (record: EntityRecord) => void;
}

/** A smart-process record on the kanban: its title, a click opens the form. */
export function RecordKanbanCard({ record, onOpen }: RecordKanbanCardProps) {
    return (
        <article className="rounded-xl border bg-card p-3 text-sm text-card-foreground shadow-sm">
            {onOpen ? (
                <button
                    type="button"
                    className="block w-full text-left font-medium hover:underline"
                    onClick={() => onOpen(record)}
                >
                    {recordTitle(record)}
                </button>
            ) : (
                <p className="font-medium">{recordTitle(record)}</p>
            )}
        </article>
    );
}
