"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Popover, PopoverContent, PopoverTrigger, StageStep } from "@workspace/ui";

import { type OrderFunnelStage, type OrderStage, stageColor } from "@/modules/entities/order";

import { ClosingStageOption } from "./ClosingStageOption";

interface OrderStageFinishStepProps {
    /** Completed and cancelled stages of the funnel */
    closingStages: readonly OrderFunnelStage[];
    /** Set when the order is already closed: the step shows where it ended */
    closedStage: OrderStage | null;
    disabled: boolean;
    first: boolean;
    onPick: (stage: OrderFunnelStage) => void;
}

/** The last chevron, as in Bitrix24: "Finish" opens the ways to close the order. */
export function OrderStageFinishStep({
    closingStages,
    closedStage,
    disabled,
    first,
    onPick,
}: OrderStageFinishStepProps) {
    const t = useTranslations("crm.orders.stage");
    const [open, setOpen] = useState(false);

    if (closedStage) {
        return (
            <StageStep
                first={first}
                filled
                current
                color={stageColor(closedStage)}
                disabled
                aria-current="step"
            >
                {closedStage.name}
            </StageStep>
        );
    }

    const pick = (stage: OrderFunnelStage) => {
        setOpen(false);
        onPick(stage);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <StageStep
                    first={first}
                    filled={false}
                    color=""
                    disabled={disabled || closingStages.length === 0}
                    className="max-w-40"
                >
                    {t("finish")}
                </StageStep>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
                <p className="px-2 pb-1.5 text-xs text-muted-foreground">{t("finishTitle")}</p>
                {closingStages.map((stage) => (
                    <ClosingStageOption key={stage.id} stage={stage} onPick={pick} />
                ))}
            </PopoverContent>
        </Popover>
    );
}
