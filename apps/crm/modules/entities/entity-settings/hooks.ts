"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
    SchemaCreateEntityDefinitionBodyDto,
    SchemaCreatePortalMemberFieldDto,
    SchemaPortalFieldOptionInputDto,
    SchemaUpdateMemberFormLayoutDto,
    SchemaUpdatePortalMemberFieldDto,
} from "@workspace/api-client/core";

import {
    addEntityFieldOption,
    createEntityDefinition,
    createEntityField,
    deleteEntityField,
    getEntityFormSchema,
    getEntityStageCategories,
    listEntityDefinitions,
    listEntityFields,
    updateEntityField,
    updateEntityForm,
    type FormPurpose,
} from "./api";

const settingsKeys = {
    fields: (code: string) => ["entity-settings", code, "fields"] as const,
    formSchema: (code: string, purpose: FormPurpose) =>
        ["entity-settings", code, "form-schema", purpose] as const,
    stages: (code: string) => ["entity-settings", code, "stage-categories"] as const,
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
