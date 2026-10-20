"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
    addComment,
    deleteComment,
    getTimeline,
    type TimelineFilter,
    type TimelineSubject,
    updateComment,
} from "../api/timeline.api";
import { feedKeys, timelineKeys } from "../model/timeline-keys";

/** История сущности: события и комментарии, новые сверху, страницами по курсору. */
export function useTimeline(subject: TimelineSubject, filter: TimelineFilter) {
    return useInfiniteQuery({
        queryKey: timelineKeys.page(subject, filter),
        queryFn: ({ pageParam }) => getTimeline(subject, pageParam, filter),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
    });
}

/** Правка комментария перечитывает таймлайн сущности и ленту (у других — через realtime). */
const useCommentMutation = <A>(
    subject: TimelineSubject,
    mutationFn: (args: A) => Promise<unknown>
) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: timelineKeys.subject(subject) }),
                queryClient.invalidateQueries({ queryKey: feedKeys.all }),
            ]),
    });
};

export const useAddComment = (subject: TimelineSubject) =>
    useCommentMutation(subject, (body: string) => addComment(subject, body));

export const useEditComment = (subject: TimelineSubject) =>
    useCommentMutation(subject, ({ id, body }: { id: string; body: string }) =>
        updateComment(id, { body })
    );

export const usePinComment = (subject: TimelineSubject) =>
    useCommentMutation(subject, ({ id, pinned }: { id: string; pinned: boolean }) =>
        updateComment(id, { pinned })
    );

export const useDeleteComment = (subject: TimelineSubject) =>
    useCommentMutation(subject, (id: string) => deleteComment(id));
