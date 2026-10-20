"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowDownLeft, ArrowUpRight, Download, Settings, Upload } from "lucide-react";

import { Button } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import type { LedgerDirection } from "@/modules/entities/finance";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

interface FinanceHeaderActionsProps {
    onNew: (direction: LedgerDirection) => void;
    onImport: () => void;
    onExport: () => void;
}

/** Быстрые действия учёта: доход и расход, таблица, выгрузка для gestor, настройки. */
export function FinanceHeaderActions({ onNew, onImport, onExport }: FinanceHeaderActionsProps) {
    const t = useTranslations("crm.finance.actions");
    const link = useLocalizedLink();
    const { can } = usePermissions();
    return (
        <div className="flex flex-wrap items-center gap-2">
            {can("finance.write") && (
                <>
                    <Button size="sm" onClick={() => onNew("income")}>
                        <ArrowDownLeft aria-hidden="true" />
                        {t("income")}
                    </Button>
                    <Button size="sm" onClick={() => onNew("expense")}>
                        <ArrowUpRight aria-hidden="true" />
                        {t("expense")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={onImport}>
                        <Upload aria-hidden="true" />
                        {t("import")}
                    </Button>
                </>
            )}
            {can("finance.admin") && (
                <Button size="sm" variant="outline" onClick={onExport}>
                    <Download aria-hidden="true" />
                    {t("export")}
                </Button>
            )}
            <Button asChild variant="ghost" size="sm">
                <Link href={link(ROUTES.CRM_FINANCE_SETTINGS)}>
                    <Settings aria-hidden="true" />
                    {t("settings")}
                </Link>
            </Button>
        </div>
    );
}
