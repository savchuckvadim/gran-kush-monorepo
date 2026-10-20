import {
    assertOpenApiOk,
    type SchemaTimelineCommentDto,
    type SchemaTimelineEntryDto,
    type SchemaTimelineEventDto,
    type SchemaTimelinePageDto,
} from "@workspace/api-client/core";
import type { COMMENT_SUBJECT_KINDS } from "@workspace/domain-events";

import { $api } from "@/modules/shared";

export type TimelinePage = SchemaTimelinePageDto;
export type TimelineEntry = SchemaTimelineEntryDto;
export type TimelineEvent = SchemaTimelineEventDto;
export type TimelineComment = SchemaTimelineCommentDto;
export type TimelineSubjectKind = (typeof COMMENT_SUBJECT_KINDS)[number];
export type TimelineFilter = "all" | "comments";

export interface TimelineSubject {
    kind: TimelineSubjectKind;
    id: string;
}

export async function getTimeline(
    subject: TimelineSubject,
    cursor: string | undefined,
    filter: TimelineFilter
): Promise<TimelinePage> {
    const response = await $api.GET("/crm/timeline/{kind}/{id}", {
        params: {
            path: subject,
            query: {
                ...(cursor ? { cursor } : {}),
                ...(filter === "comments" ? { only: "comments" } : {}),
            },
        },
    });
    return assertOpenApiOk<TimelinePage>(response);
}

export async function addComment(subject: TimelineSubject, body: string): Promise<TimelineComment> {
    const response = await $api.POST("/crm/timeline/{kind}/{id}/comments", {
        params: { path: subject },
        body: { body },
    });
    return assertOpenApiOk<TimelineComment>(response);
}

export async function updateComment(
    id: string,
    change: { body?: string; pinned?: boolean }
): Promise<TimelineComment> {
    const response = await $api.PATCH("/crm/comments/{id}", {
        params: { path: { id } },
        body: change,
    });
    return assertOpenApiOk<TimelineComment>(response);
}

export async function deleteComment(id: string): Promise<void> {
    assertOpenApiOk(await $api.DELETE("/crm/comments/{id}", { params: { path: { id } } }));
}
