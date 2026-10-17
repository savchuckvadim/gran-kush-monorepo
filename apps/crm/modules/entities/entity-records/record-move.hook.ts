"use client";

import { type QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";

import { type EntityRecord, setEntityRecordStage } from "./api";
import { applyOptimisticRecordMove, type RecordStage } from "./record-cache";
import { recordKeys } from "./record-keys";

export interface MoveEntityRecordInput {
    record: EntityRecord;
    target: RecordStage;
    /** The card it goes under in the target column; `null` — the top; not given — a stage change */
    afterId?: string | null;
}

interface MoveContext {
    snapshot: ReadonlyArray<readonly [QueryKey, unknown]>;
}

/**
 * Moves a smart-process record optimistically: the card is already in its new place while the
 * request runs; on an error every touched cache returns to what it was.
 */
export function useMoveEntityRecord(code: string) {
    const queryClient = useQueryClient();

    return useMutation<EntityRecord, Error, MoveEntityRecordInput, MoveContext>({
        mutationFn: ({ record, target, afterId }) =>
            setEntityRecordStage(code, record.id, target.id, afterId),
        onMutate: async ({ record, target, afterId }) => {
            await queryClient.cancelQueries({ queryKey: recordKeys.all(code) });
            const snapshot = queryClient.getQueriesData({ queryKey: recordKeys.all(code) });
            applyOptimisticRecordMove(queryClient, code, record, target, afterId ?? null);
            return { snapshot };
        },
        onError: (_error, _input, context) => {
            context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
        },
        onSuccess: (saved) => queryClient.setQueryData(recordKeys.detail(code, saved.id), saved),
        onSettled: () => queryClient.invalidateQueries({ queryKey: recordKeys.all(code) }),
    });
}
