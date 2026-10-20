"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Printer } from "lucide-react";

import { Button } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { labelsQuery } from "../model/label-request";

/** Лист QR-этикеток в новой вкладке: карточка или каталог остаются открытыми. */
export function ProductLabelsButton({
    productIds,
    label,
}: {
    productIds: readonly string[];
    label?: string;
}) {
    const t = useTranslations("crm.productLabels");
    const link = useLocalizedLink();

    return (
        <Button asChild variant="outline" size="sm">
            <Link
                href={link(`${ROUTES.PRINT_PRODUCT_LABELS}${labelsQuery(productIds)}`)}
                target="_blank"
                rel="noopener"
            >
                <Printer aria-hidden="true" />
                {label ?? t("button")}
            </Link>
        </Button>
    );
}
