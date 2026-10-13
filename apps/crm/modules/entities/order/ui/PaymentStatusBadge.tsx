"use client";

import { useTranslations } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";

import type { PaymentStatus } from "../model/order.types";

const TONE: Readonly<Record<PaymentStatus, string>> = {
    pending: "bg-warning/15 text-warning-text",
    paid: "bg-success/15 text-success-text",
    refunded: "bg-destructive/10 text-destructive",
};

interface PaymentStatusBadgeProps {
    status: PaymentStatus;
    className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
    const t = useTranslations("crm.orders.list.payment");

    return (
        <span
            data-slot="badge"
            className={cn("inline-flex rounded-full px-2 py-0.5 text-xs", TONE[status], className)}
        >
            {t(status)}
        </span>
    );
}
