"use client";

import { useTranslations } from "next-intl";

import { ArrowRight } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { type MovableOrder, type OrderFunnelStage, stageColor } from "@/modules/entities/order";

interface NextStageButtonProps {
    order: MovableOrder;
    next: OrderFunnelStage;
    onMove: (order: MovableOrder, target: OrderFunnelStage) => void;
    disabled?: boolean;
    /** `chip` — мелкая кнопка в углу карточки канбана; `button` — в карточке заказа */
    variant?: "button" | "chip";
    className?: string;
}

/**
 * Почти всякий переход заказа — «на следующую стадию», поэтому он вынесен в одну кнопку:
 * в карточке заказа и на карточке канбана, где заменяет перетаскивание на соседнюю колонку.
 */
export function NextStageButton({
    order,
    next,
    onMove,
    disabled,
    variant = "button",
    className,
}: NextStageButtonProps) {
    const t = useTranslations("crm.orders.stage");
    const label = t("next", { stage: next.name });

    if (variant === "chip") {
        return (
            <button
                type="button"
                disabled={disabled}
                aria-label={label}
                title={label}
                draggable={false}
                onClick={(event) => {
                    // карточка — ручка перетаскивания и ссылка на заказ: клик не всплывает
                    event.stopPropagation();
                    event.preventDefault();
                    onMove(order, next);
                }}
                className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 text-[11px] font-bold whitespace-nowrap transition-colors",
                    "hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50",
                    className
                )}
            >
                <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: stageColor(next) }}
                />
                <span className="max-w-24 truncate">{next.name}</span>
                <ArrowRight className="size-3" aria-hidden="true" />
            </button>
        );
    }

    return (
        <Button
            type="button"
            disabled={disabled}
            onClick={() => onMove(order, next)}
            className={className}
        >
            {label}
            <ArrowRight aria-hidden="true" />
        </Button>
    );
}
