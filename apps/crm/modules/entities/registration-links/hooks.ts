"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
    SchemaCreateRegistrationLinkDto,
    SchemaUpdateRegistrationLinkDto,
} from "@workspace/api-client/core";

import {
    createRegistrationLink,
    listRegistrationLinks,
    updateRegistrationLink,
} from "./api";

const linkKeys = {
    all: ["registration-links"] as const,
};

export function useRegistrationLinks(enabled = true) {
    return useQuery({
        queryKey: linkKeys.all,
        queryFn: () => listRegistrationLinks(),
        enabled,
    });
}

export function useCreateRegistrationLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: SchemaCreateRegistrationLinkDto) => createRegistrationLink(body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: linkKeys.all }),
    });
}

export function useUpdateRegistrationLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: SchemaUpdateRegistrationLinkDto }) =>
            updateRegistrationLink(id, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: linkKeys.all }),
    });
}
