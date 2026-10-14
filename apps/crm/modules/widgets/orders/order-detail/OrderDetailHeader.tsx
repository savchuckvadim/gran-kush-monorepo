"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowLeft } from "lucide-react";

import { Button } from "@workspace/ui";

import type { OrderDetail } from "@/modules/entities/order";
import { useDateTimeFormat } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

interface OrderDetailHeaderProps {
    order: OrderDetail;
    showBack?: boolean;
}

export function OrderDetailHeader({ order, showBack = true }: OrderDetailHeaderProps) {
    const t = useTranslations("crm.orders.detail");
    const toAppPath = useLocalizedLink();
    const dateTime = useDateTimeFormat();

    return (
        <div className="flex items-center gap-3">
            {showBack && (
                <Button variant="ghost" size="icon-sm" asChild>
                    <Link
                        href={toAppPath(ROUTES.CRM_ORDERS)}
                        aria-label={t("back")}
                        title={t("back")}
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                </Button>
            )}
            <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold">
                    {t("orderTitle")} {order.orderNumber}
                </h1>
                <p className="text-sm text-muted-foreground">{dateTime(order.orderedAt)}</p>
            </div>
        </div>
    );
}
