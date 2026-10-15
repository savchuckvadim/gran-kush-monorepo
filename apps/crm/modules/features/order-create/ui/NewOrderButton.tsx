"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Plus } from "lucide-react";

import { Button } from "@workspace/ui";

import { ROUTES, useLocalizedLink } from "@/modules/shared";

/** Opens the new order form; with `memberId` the member is already chosen. */
export function NewOrderButton({
    memberId,
    size = "default",
    variant = "default",
}: {
    memberId?: string;
    size?: "default" | "sm";
    variant?: "default" | "outline";
}) {
    const t = useTranslations("crm.orders.create");
    const localizedLink = useLocalizedLink();
    const query = memberId ? `?memberId=${encodeURIComponent(memberId)}` : "";

    return (
        <Button asChild size={size} variant={variant}>
            <Link href={localizedLink(`${ROUTES.CRM_ORDER_NEW}${query}`)}>
                <Plus aria-hidden="true" />
                {t("button")}
            </Link>
        </Button>
    );
}
