"use client";

import { useTranslations } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";

import type { OrderStage } from "../model/order.types";
import { stageColor } from "../model/order-stage";

interface OrderStageBadgeProps {
    stage: OrderStage | null;
    className?: string;
}

/** The order's stage: a dot in the stage colour and its name. */
export function OrderStageBadge({ stage, className }: OrderStageBadgeProps) {
    const t = useTranslations("crm.orders.stage");

    return (
        <span
            data-slot="badge"
            className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs",
                className
            )}
        >
            {stage ? (
                <>
                    <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: stageColor(stage) }}
                    />
                    <span className="truncate">{stage.name}</span>
                </>
            ) : (
                <span className="text-muted-foreground">{t("noStage")}</span>
            )}
        </span>
    );
}
