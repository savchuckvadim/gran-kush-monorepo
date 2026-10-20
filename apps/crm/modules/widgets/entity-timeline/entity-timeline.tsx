"use client";

import { Fragment, type ReactNode, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Card, LoadMoreTrigger } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import {
    type TimelineEntry,
    type TimelineFilter,
    type TimelineSubject,
    useAddComment,
    useTimeline,
} from "@/modules/entities/timeline";
import { useDateFormat } from "@/modules/shared/lib/use-date-format";

import { TimelineCommentItem } from "./timeline-comment-item";
import { groupByDay, relativeDay } from "./timeline-days";
import { TimelineEventItem } from "./timeline-event-item";
import { TimelineTextForm } from "./timeline-text-form";

/** Запись не из API: история карточки до событий шины (визиты, заказы участника). */
export interface TimelineExtraItem {
    key: string;
    at: string;
    render: (last: boolean) => ReactNode;
}

type Row = { key: string; at: string } & (
    | { entry: TimelineEntry; extra?: never }
    | { extra: TimelineExtraItem; entry?: never }
);

interface EntityTimelineProps {
    subject: TimelineSubject;
    /** События, которые карточка уже показывает своими записями (`extra`) */
    hiddenEvents?: readonly string[];
    extra?: readonly TimelineExtraItem[];
    className?: string;
}

/**
 * История сущности (TASK-782): комментарии команды сверху поля ввода, закреплённые, затем всё,
 * что случилось, по дням. Список прокручивается внутри карточки — поле ввода всегда под рукой.
 */
export function EntityTimeline({
    subject,
    hiddenEvents = [],
    extra = [],
    className,
}: EntityTimelineProps) {
    const t = useTranslations("crm.timeline");
    const date = useDateFormat();
    const [filter, setFilter] = useState<TimelineFilter>("all");
    const timeline = useTimeline(subject, filter);
    const add = useAddComment(subject);
    const pages = timeline.data?.pages;
    const pinned = pages?.[0]?.pinned ?? [];

    const days = useMemo(() => {
        const entries = (pages ?? [])
            .flatMap((page) => page.entries)
            .filter(
                (entry) =>
                    entry.kind === "comment" || !hiddenEvents.includes(entry.event?.name ?? "")
            );
        const rows: Row[] = [
            ...entries.map((entry) => ({ key: entry.id, at: entry.at, entry })),
            ...(filter === "all"
                ? extra.map((item) => ({ key: item.key, at: item.at, extra: item }))
                : []),
        ].sort((a, b) => b.at.localeCompare(a.at));
        return groupByDay(rows);
    }, [pages, extra, filter, hiddenEvents]);

    const dayTitle = (day: string) => {
        const relative = relativeDay(day);
        return relative ? t(relative) : date(`${day}T12:00:00`);
    };

    const renderRow = (row: Row, last: boolean) => {
        if (row.extra) return <Fragment key={row.key}>{row.extra.render(last)}</Fragment>;
        const { entry } = row;
        if (entry.comment) {
            return (
                <TimelineCommentItem
                    key={row.key}
                    comment={entry.comment}
                    subject={subject}
                    last={last}
                />
            );
        }
        return entry.event ? (
            <TimelineEventItem key={row.key} event={entry.event} last={last} />
        ) : null;
    };

    return (
        <Card className={cn("flex min-h-0 flex-col gap-4 px-4 md:px-5", className)}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">{t("title")}</h2>
                <div className="flex gap-1">
                    {(["all", "comments"] as const).map((value) => (
                        <Button
                            key={value}
                            size="sm"
                            variant={filter === value ? "secondary" : "ghost"}
                            onClick={() => setFilter(value)}
                        >
                            {t(`filters.${value}`)}
                        </Button>
                    ))}
                </div>
            </div>
            <TimelineTextForm
                placeholder={t("composer.placeholder")}
                hint={t("composer.hint")}
                submitLabel={t("composer.send")}
                pendingLabel={t("composer.sending")}
                pending={add.isPending}
                onSubmit={(body, reset) =>
                    add.mutate(body, {
                        onSuccess: reset,
                        onError: (error) => toast.error(getApiErrorMessage(error)),
                    })
                }
            />
            {pinned.length > 0 && (
                <section className="flex flex-col gap-1 rounded-xl bg-primary/5 p-2">
                    <h3 className="px-1 text-xs font-medium text-primary">{t("pinned")}</h3>
                    <ol className="flex flex-col">
                        {pinned.map((comment, index) => (
                            <TimelineCommentItem
                                key={`pinned:${comment.id}`}
                                comment={comment}
                                subject={subject}
                                last={index === pinned.length - 1}
                            />
                        ))}
                    </ol>
                </section>
            )}
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
                {timeline.isLoading ? null : days.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("empty")}</p>
                ) : (
                    days.map(({ day, items }) => (
                        <section key={day} className="flex flex-col gap-1">
                            <h3 className="text-xs font-medium text-muted-foreground">
                                {dayTitle(day)}
                            </h3>
                            <ol className="relative flex flex-col">
                                {items.map((row, index) =>
                                    renderRow(row, index === items.length - 1)
                                )}
                            </ol>
                        </section>
                    ))
                )}
                <LoadMoreTrigger
                    onLoadMore={() => void timeline.fetchNextPage()}
                    hasMore={timeline.hasNextPage}
                    loading={timeline.isFetchingNextPage}
                    label={t("loadMore")}
                />
            </div>
        </Card>
    );
}
