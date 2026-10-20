"use client";

import { useTranslations } from "next-intl";

import type { ReactNode } from "react";

import { useDateFormat } from "@/modules/shared/lib/use-date-format";

import { relativeDay, type TimelineDay } from "./timeline-days";

interface TimelineDayListProps<T> {
    days: TimelineDay<T>[];
    renderRow: (row: T, last: boolean) => ReactNode;
}

/** Записи по дням: «Сегодня», «Вчера» или дата, под ним строки на общей нити. */
export function TimelineDayList<T>({ days, renderRow }: TimelineDayListProps<T>) {
    const t = useTranslations("crm.timeline");
    const date = useDateFormat();

    return (
        <>
            {days.map(({ day, items }) => {
                const relative = relativeDay(day);
                return (
                    <section key={day} className="flex flex-col gap-1">
                        <h3 className="text-xs font-medium text-muted-foreground">
                            {relative ? t(relative) : date(`${day}T12:00:00`)}
                        </h3>
                        <ol className="relative flex flex-col">
                            {items.map((row, index) => renderRow(row, index === items.length - 1))}
                        </ol>
                    </section>
                );
            })}
        </>
    );
}
