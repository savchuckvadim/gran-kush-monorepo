"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
    SchemaCreateEntityRecordDto,
    SchemaUpdateEntityRecordDto,
} from "@workspace/api-client/core";

import {
    createEntityRecord,
    deleteEntityRecord,
    getEntityRecord,
    listEntityRecords,
    setEntityRecordStage,
    updateEntityRecord,
    type EntityRecordListParams,
} from "./api";

const recordKeys = {
    all: (code: string) => ["entity-records", code] as const,
    list: (code: string, params?: EntityRecordListParams) =>
        ["entity-records", code, "list", params ?? {}] as const,
    detail: (code: string, id: string) => ["entity-records", code, "detail", id] as const,
};

export function useEntityRecords(code: string, params?: EntityRecordListParams, enabled = true) {
    return useQuery({
        queryKey: recordKeys.list(code, params),
        queryFn: () => listEntityRecords(code, params),
        enabled: enabled && !!code,
    });
}

export function useEntityRecord(code: string, id: string, enabled = true) {
    return useQuery({
        queryKey: recordKeys.detail(code, id),
        queryFn: () => getEntityRecord(code, id),
        enabled: enabled && !!code && !!id,
    });
}

export function useCreateEntityRecord(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: SchemaCreateEntityRecordDto) => createEntityRecord(code, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: recordKeys.all(code) }),
    });
}

export function useUpdateEntityRecord(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: SchemaUpdateEntityRecordDto }) =>
            updateEntityRecord(code, id, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: recordKeys.all(code) }),
    });
}

export function useDeleteEntityRecord(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteEntityRecord(code, id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: recordKeys.all(code) }),
    });
}

export function useSetEntityRecordStage(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, stageId }: { id: string; stageId: string | null }) =>
            setEntityRecordStage(code, id, stageId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: recordKeys.all(code) }),
    });
}
