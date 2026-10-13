"use client";

import { type OrderFunnelStage, stageColor } from "@/modules/entities/order";

interface ClosingStageOptionProps {
    stage: OrderFunnelStage;
    onPick: (stage: OrderFunnelStage) => void;
}

/** One way to close an order in the "Finish" popover: completed, cancelled. */
export function ClosingStageOption({ stage, onPick }: ClosingStageOptionProps) {
    return (
        <button
            type="button"
            onClick={() => onPick(stage)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        >
            <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: stageColor(stage) }}
            />
            <span className="truncate">{stage.name}</span>
        </button>
    );
}
