"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui/components/card";

import { useDateFormat } from "@/modules/shared/lib/use-date-format";

import { buildMemberActivity, groupActivityByDay, relativeDay } from "../model/member-activity";
import type { MemberCardData } from "../model/member-card.types";

import { MemberActivityItem } from "./MemberActivityItem";

/** Visits, orders and profile events on one timeline, by day. */
export function MemberActivityFeed({ data }: { data: MemberCardData }) {
    const t = useTranslations("crm.members.card.feed");
    const date = useDateFormat();
    const days = useMemo(() => groupActivityByDay(buildMemberActivity(data)), [data]);

    const dayTitle = (day: string) => {
        const relative = relativeDay(day);
        if (relative === "today") return t("today");
        if (relative === "yesterday") return t("yesterday");
        return date(`${day}T12:00:00`);
    };

    return (
        <Card className="gap-4 px-4 md:px-5">
            <h2 className="text-base font-semibold">{t("title")}</h2>
            {days.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
                <div className="flex flex-col gap-5">
                    {days.map(({ day, items }) => (
                        <section key={day} className="flex flex-col gap-1">
                            <h3 className="text-xs font-medium text-muted-foreground">
                                {dayTitle(day)}
                            </h3>
                            <ol className="relative flex flex-col">
                                {items.map((item, index) => (
                                    <MemberActivityItem
                                        key={item.key}
                                        item={item}
                                        last={index === items.length - 1}
                                    />
                                ))}
                            </ol>
                        </section>
                    ))}
                </div>
            )}
        </Card>
    );
}
