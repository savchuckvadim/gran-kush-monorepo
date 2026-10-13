"use client";

import { useTranslations } from "next-intl";

import { Columns3, List } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import type { OrdersView } from "./use-orders-view";

const VIEWS = [
    { value: "list", icon: List },
    { value: "kanban", icon: Columns3 },
] as const satisfies ReadonlyArray<{ value: OrdersView; icon: typeof List }>;

interface OrdersViewSwitchProps {
    value: OrdersView;
    onChange: (view: OrdersView) => void;
}

/** "List / Kanban", as the tabs above Bitrix24 deals. */
export function OrdersViewSwitch({ value, onChange }: OrdersViewSwitchProps) {
    const t = useTranslations("crm.orders.views");

    return (
        <div
            role="group"
            aria-label={t("label")}
            className="inline-flex overflow-hidden rounded-lg border bg-background"
        >
            {VIEWS.map(({ value: view, icon: Icon }) => (
                <Button
                    key={view}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={value === view}
                    className={cn("gap-1.5 rounded-none border-0", value === view && "bg-muted")}
                    onClick={() => onChange(view)}
                >
                    <Icon className="size-4" aria-hidden="true" />
                    {t(view)}
                </Button>
            ))}
        </div>
    );
}
