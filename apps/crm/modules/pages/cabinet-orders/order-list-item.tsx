"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ChevronRight } from "lucide-react";

import type { SchemaCabinetOrderListDto } from "@workspace/api-client/core";

import { useMoneyFormat } from "@/modules/shared/lib/use-money-format";

import { OrderStageBadge } from "./order-stage-badge";

interface OrderListItemProps {
    order: SchemaCabinetOrderListDto;
    href: string;
    formatDate: (iso: string) => string;
}

export function OrderListItem({ order, href, formatDate }: OrderListItemProps) {
    const t = useTranslations("cabinet.orders");
    const money = useMoneyFormat();
    return (
        <li>
            <Link
                href={href}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{order.orderNumber}</span>
                        <OrderStageBadge stage={order.stage} fallback={t("noStage")} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {formatDate(order.orderedAt)} · {t("items", { count: order.itemsCount })}
                    </p>
                </div>
                <span className="font-semibold tabular-nums">{money(order.total)}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
        </li>
    );
}
