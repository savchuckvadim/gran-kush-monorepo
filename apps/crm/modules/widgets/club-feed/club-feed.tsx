"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Card, LoadMoreTrigger } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { usePortalInfo } from "@/modules/entities/portal";
import {
    type FeedFilter,
    feedKeys,
    type TimelineEntry,
    useAddComment,
    useFeed,
} from "@/modules/entities/timeline";
import {
    groupByDay,
    TimelineCommentItem,
    TimelineDayList,
    TimelineEventItem,
    TimelineTextForm,
} from "@/modules/widgets/entity-timeline";

import { isFeedEcho } from "./feed-echo";
import { FeedFilters } from "./feed-filters";
import { FeedSubject } from "./feed-subject";
import { useFeedFresh } from "./use-feed-fresh";

const ALL: FeedFilter = { groups: [], mine: false };

/**
 * Лента клуба (TASK-808): всё, что происходит в клубе, и записи команды — как лента соцсети.
 * Пост — комментарий к клубу; у записи о сущности — ссылка на её карточку. Новое не вставляется
 * само: кнопка «Новых записей» показывает его, не сдвигая список под рукой.
 */
export function ClubFeed() {
    const t = useTranslations("crm.feed");
    const queryClient = useQueryClient();
    const { data: portal } = usePortalInfo();
    const { employeeId } = usePermissions();
    const portalId = portal?.portalId;
    const [filter, setFilter] = useState<FeedFilter>(ALL);
    const feed = useFeed(portalId, filter, employeeId);
    const post = useAddComment({ kind: "portal", id: portalId ?? "" });
    const { fresh, reset } = useFeedFresh();

    const days = useMemo(
        () =>
            groupByDay(
                (feed.data?.pages ?? [])
                    .flatMap((page) => page.entries)
                    .filter((entry) => !isFeedEcho(entry))
            ),
        [feed.data]
    );

    const showFresh = () => {
        reset();
        void queryClient.resetQueries({ queryKey: feedKeys.all });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const renderRow = (entry: TimelineEntry, last: boolean) => {
        if (entry.comment) {
            const subject = entry.comment.subject;
            return (
                <TimelineCommentItem
                    key={entry.id}
                    comment={entry.comment}
                    subject={{ kind: subject.kind, id: subject.id }}
                    last={last}
                    aside={<FeedSubject subject={subject} />}
                />
            );
        }
        if (!entry.event) return null;
        const subject = entry.event.subject;
        return (
            <TimelineEventItem
                key={entry.id}
                event={entry.event}
                last={last}
                aside={subject ? <FeedSubject subject={subject} /> : null}
            />
        );
    };

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <div>
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
            <Card className="px-4 md:px-5">
                <TimelineTextForm
                    placeholder={t("composer.placeholder")}
                    hint={t("composer.hint")}
                    submitLabel={t("composer.send")}
                    pendingLabel={t("composer.sending")}
                    pending={post.isPending || !portalId}
                    onSubmit={(body, clear) =>
                        post.mutate(body, {
                            onSuccess: () => {
                                clear();
                                reset();
                            },
                            onError: (error) => toast.error(getApiErrorMessage(error)),
                        })
                    }
                />
            </Card>
            <FeedFilters filter={filter} onChange={setFilter} />
            {fresh > 0 && (
                <Button
                    variant="secondary"
                    className="sticky top-20 z-10 self-center rounded-full shadow-md"
                    onClick={showFresh}
                >
                    {t("fresh", { count: fresh })}
                </Button>
            )}
            <Card className="gap-5 px-4 md:px-5">
                {!feed.isLoading && days.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("empty")}</p>
                ) : (
                    <TimelineDayList days={days} renderRow={renderRow} />
                )}
                <LoadMoreTrigger
                    onLoadMore={() => void feed.fetchNextPage()}
                    hasMore={feed.hasNextPage}
                    loading={feed.isFetchingNextPage}
                    label={t("loadMore")}
                />
            </Card>
        </div>
    );
}
