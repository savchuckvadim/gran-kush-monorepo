"use client";

import { useTranslations } from "next-intl";

import { Plus } from "lucide-react";

import { Button } from "@workspace/ui";

import { newOrderRef } from "@/modules/shared/lib/entity-slider";
import { EntityLink } from "@/modules/shared/ui/EntityLink";

/**
 * Opens the new order form — in a slider over the page on a wide screen, as its page on a phone;
 * with `memberId` the member is already chosen.
 */
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
    const ref = newOrderRef({ memberId });

    return (
        <Button asChild size={size} variant={variant}>
            <EntityLink kind={ref.kind} id={ref.id}>
                <Plus aria-hidden="true" />
                {t("button")}
            </EntityLink>
        </Button>
    );
}
