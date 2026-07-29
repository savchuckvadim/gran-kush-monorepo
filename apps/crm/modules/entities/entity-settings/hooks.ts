"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
    SchemaCreateEntityDefinitionBodyDto,
    SchemaCreatePortalMemberFieldDto,
    SchemaCreateStageCategoryDto,
    SchemaPortalFieldOptionInputDto,
    SchemaStatusItemInputDto,
    SchemaUpdateMemberFormLayoutDto,
    SchemaUpdatePortalMemberFieldDto,
    SchemaUpdateStageCategoryDto,
    SchemaUpdateStatusItemDto,
} from "@workspace/api-client/core";

import {
    addEntityFieldOption,
    addEntityStatusItem,
    createEntityDefinition,
    createEntityField,
    createEntityStageCategory,
    createEntityStatusSet,
    deleteEntityField,
    deleteEntityStageCategory,
    deleteEntityStatusItem,
    getEntityFormSchema,
    getEntityStageCategories,
    listEntityDefinitions,
    listEntityFields,
    listEntityStatusSets,
    updateEntityField,
    updateEntityForm,
    updateEntityStageCategory,
    updateEntityStatusItem,
    type FormPurpose,
} from "./api";

const settingsKeys = {
    fields: (code: string) => ["entity-settings", code, "fields"] as const,
    formSchema: (code: string, purpose: FormPurpose) =>
        ["entity-settings", code, "form-schema", purpose] as const,
    stages: (code: string) => ["entity-settings", code, "stage-categories"] as const,
    statusSets: (code: string) => ["entity-settings", code, "status-sets"] as const,
    entities: ["entity-settings", "definitions"] as const,
};

export function useEntityFields(code: string, enabled = true) {
    return useQuery({
        queryKey: settingsKeys.fields(code),
        queryFn: () => listEntityFields(code),
        enabled: enabled && !!code,
    });
}

export function useEntityFormSchema(code: string, purpose: FormPurpose, enabled = true) {
    return useQuery({
        queryKey: settingsKeys.formSchema(code, purpose),
        queryFn: () => getEntityFormSchema(code, purpose),
        enabled: enabled && !!code,
    });
}

export function useEntityStageCategories(code: string, enabled = true) {
    return useQuery({
        queryKey: settingsKeys.stages(code),
        queryFn: () => getEntityStageCategories(code),
        enabled: enabled && !!code,
    });
}

export function useEntityDefinitions(enabled = true) {
    return useQuery({
        queryKey: settingsKeys.entities,
        queryFn: () => listEntityDefinitions(),
        enabled,
    });
}

export function useCreateEntityField(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: SchemaCreatePortalMemberFieldDto) => createEntityField(code, body),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: settingsKeys.fields(code) }),
    });
}

export function useUpdateEntityField(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            fieldKey,
            body,
        }: {
            fieldKey: string;
            body: SchemaUpdatePortalMemberFieldDto;
        }) => updateEntityField(code, fieldKey, body),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: settingsKeys.fields(code) }),
    });
}

export function useDeleteEntityField(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (fieldKey: string) => deleteEntityField(code, fieldKey),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: settingsKeys.fields(code) }),
    });
}

export function useAddEntityFieldOption(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            fieldKey,
            body,
        }: {
            fieldKey: string;
            body: SchemaPortalFieldOptionInputDto;
        }) => addEntityFieldOption(code, fieldKey, body),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: settingsKeys.fields(code) }),
    });
}

export function useUpdateEntityForm(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            purpose,
            body,
        }: {
            purpose: FormPurpose;
            body: SchemaUpdateMemberFormLayoutDto;
        }) => updateEntityForm(code, purpose, body),
        onSuccess: (_data, variables) =>
            queryClient.invalidateQueries({
                queryKey: settingsKeys.formSchema(code, variables.purpose),
            }),
    });
}

export function useCreateEntityDefinition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: SchemaCreateEntityDefinitionBodyDto) => createEntityDefinition(body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.entities }),
    });
}

export function useCreateStageCategory(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: SchemaCreateStageCategoryDto) => createEntityStageCategory(code, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.stages(code) }),
    });
}

export function useUpdateStageCategory(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            categoryId,
            body,
        }: {
            categoryId: string;
            body: SchemaUpdateStageCategoryDto;
        }) => updateEntityStageCategory(code, categoryId, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.stages(code) }),
    });
}

export function useDeleteStageCategory(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (categoryId: string) => deleteEntityStageCategory(code, categoryId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.stages(code) }),
    });
}

export function useEntityStatusSets(code: string, enabled = true) {
    return useQuery({
        queryKey: settingsKeys.statusSets(code),
        queryFn: () => listEntityStatusSets(code),
        enabled: enabled && !!code,
    });
}

export function useCreateStatusSet(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: { code: string; items: SchemaStatusItemInputDto[] }) =>
            createEntityStatusSet(code, body),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: settingsKeys.statusSets(code) }),
    });
}

export function useAddStatusItem(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ setId, body }: { setId: string; body: SchemaStatusItemInputDto }) =>
            addEntityStatusItem(code, setId, body),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: settingsKeys.statusSets(code) }),
    });
}

export function useUpdateStatusItem(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            setId,
            itemId,
            body,
        }: {
            setId: string;
            itemId: string;
            body: SchemaUpdateStatusItemDto;
        }) => updateEntityStatusItem(code, setId, itemId, body),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: settingsKeys.statusSets(code) }),
    });
}

export function useDeleteStatusItem(code: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ setId, itemId }: { setId: string; itemId: string }) =>
            deleteEntityStatusItem(code, setId, itemId),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: settingsKeys.statusSets(code) }),
    });
}
