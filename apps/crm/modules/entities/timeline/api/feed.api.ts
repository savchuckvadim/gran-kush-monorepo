import { assertOpenApiOk } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

import type { TimelinePage } from "./timeline.api";

/** Разделы ленты: группа события (`order.*` → `order`) или записи команды (`comment`). */
export const FEED_GROUPS = [
    "order",
    "member",
    "presence",
    "comment",
    "employee",
    "product",
    "finance",
] as const;
export type FeedGroup = (typeof FEED_GROUPS)[number];

export interface FeedFilter {
    /** Пусто — всё */
    groups: FeedGroup[];
    /** Только то, что сделал или написал сам сотрудник */
    mine: boolean;
}

/** Лента клуба — таймлайн с предметом `portal`: все события и записи команды. */
export async function getFeed(
    portalId: string,
    cursor: string | undefined,
    filter: FeedFilter,
    employeeId: string | undefined
): Promise<TimelinePage> {
    const response = await $api.GET("/crm/timeline/{kind}/{id}", {
        params: {
            path: { kind: "portal", id: portalId },
            query: {
                ...(cursor ? { cursor } : {}),
                ...(filter.groups.length ? { groups: filter.groups.join(",") } : {}),
                ...(filter.mine && employeeId ? { authorId: employeeId } : {}),
            },
        },
    });
    return assertOpenApiOk<TimelinePage>(response);
}
