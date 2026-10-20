"use client";

import { useTranslations } from "next-intl";

import { Banknote, CreditCard, Landmark } from "lucide-react";

import { Card } from "@workspace/ui";

import type { FinanceOverview } from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";
import { CardHeading } from "@/modules/shared/ui";

const ICONS = { cash: Banknote, bank: Landmark, card: CreditCard } as const;

/** Остатки кассы, банка и карты на конец периода — по всем проводкам учёта. */
export function AccountBalances({ overview }: { overview: FinanceOverview }) {
    const t = useTranslations("crm.finance");
    const money = useMoneyFormat();
    return (
        <Card contentClassName="space-y-3 px-0">
            <CardHeading title={t("overview.accountsTitle")} hint={t("overview.accountsHint")} />
            <ul className="divide-y">
                {overview.accounts.map(({ account, balance }) => {
                    const Icon = ICONS[account];
                    return (
                        <li key={account} className="flex items-center gap-3 py-2 text-sm">
                            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                            <span className="flex-1">{t(`accounts.${account}`)}</span>
                            <span
                                className={`tabular-nums ${balance < 0 ? "text-destructive" : ""}`}
                            >
                                {money(balance)}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
