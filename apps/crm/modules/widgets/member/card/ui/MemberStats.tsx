"use client";

import { useTranslations } from "next-intl";

import { CalendarHeart, DoorOpen, ShoppingBag, Wallet } from "lucide-react";

import { StatTile } from "@workspace/ui";

import type { CrmMemberDetails } from "@/modules/entities/member";
import { useCompactDateFormat, useDateFormat } from "@/modules/shared/lib/use-date-format";
import { useMoneyFormat } from "@/modules/shared/lib/use-money-format";
import { useTenureFormat } from "@/modules/shared/lib/use-span-format";

import type { MemberStats as MemberStatsValue } from "../model/member-stats";

interface MemberStatsProps {
    member: CrmMemberDetails;
    stats: MemberStatsValue;
}

export function MemberStats({ member, stats }: MemberStatsProps) {
    const t = useTranslations("crm.members.card.stats");
    const tCard = useTranslations("crm.members.card");
    const money = useMoneyFormat();
    const compactDate = useCompactDateFormat();
    const date = useDateFormat();
    const tenure = useTenureFormat();

    const visitsHint = stats.inClubNow
        ? tCard("inClubNow")
        : stats.lastVisitAt
          ? t("lastVisit", { date: compactDate(stats.lastVisitAt) })
          : t("noVisits");

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile
                icon={<DoorOpen aria-hidden="true" />}
                label={t("visits")}
                value={stats.visits}
                hint={visitsHint}
            />
            <StatTile
                icon={<ShoppingBag aria-hidden="true" />}
                label={t("orders")}
                value={stats.orders}
                hint={
                    stats.orders === 0
                        ? t("noOrders")
                        : t("inProgress", { count: stats.ordersInProgress })
                }
            />
            <StatTile
                icon={<Wallet aria-hidden="true" />}
                label={t("spent")}
                value={money(stats.spent)}
                hint={t("spentHint", { count: stats.handedOver })}
            />
            <StatTile
                icon={<CalendarHeart aria-hidden="true" />}
                label={t("since")}
                value={tenure(member.createdAt)}
                hint={t("sinceHint", { date: date(member.createdAt) })}
            />
        </div>
    );
}
