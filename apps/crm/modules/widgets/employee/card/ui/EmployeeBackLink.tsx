"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowLeft } from "lucide-react";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

/** Только на странице сотрудника: слайдер закрывают крестиком. */
export function EmployeeBackLink() {
    const t = useTranslations("crm.employees.card");
    const toAppPath = useLocalizedLink();

    return (
        <Link
            href={toAppPath(ROUTES.CRM_EMPLOYEES)}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("back")}
        </Link>
    );
}
