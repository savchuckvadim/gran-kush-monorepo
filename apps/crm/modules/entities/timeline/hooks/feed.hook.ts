"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { type FeedFilter, getFeed } from "../api/feed.api";
import { feedKeys } from "../model/timeline-keys";

/** Лента клуба страницами по курсору; `employeeId` — для фильтра «только мои». */
export function useFeed(
    portalId: string | undefined,
    filter: FeedFilter,
    employeeId: string | undefined
) {
    return useInfiniteQuery({
        queryKey: feedKeys.list(portalId ?? "", filter),
        queryFn: ({ pageParam }) => getFeed(portalId ?? "", pageParam, filter, employeeId),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
        enabled: Boolean(portalId),
    });
}
