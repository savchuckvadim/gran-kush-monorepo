"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowLeft } from "lucide-react";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

/** Only on the member's own page: a slider closes instead. */
export function MemberBackLink() {
    const t = useTranslations("crm.members.card");
    const toAppPath = useLocalizedLink();

    return (
        <Link
            href={toAppPath(ROUTES.CRM_MEMBERS)}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("back")}
        </Link>
    );
}
