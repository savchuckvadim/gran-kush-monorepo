"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usePortal } from "@/modules/processes";

import { createCrmMember, getCrmMemberCreateSchema } from "../api/member.api";

import { memberKeys } from "./member.hook";

export function useCrmMemberCreateSchema() {
    const { portalSlug } = usePortal();
    return useQuery({
        queryKey: [...memberKeys.all, "create-schema", portalSlug] as const,
        queryFn: getCrmMemberCreateSchema,
        enabled: Boolean(portalSlug),
    });
}

export function useCreateCrmMember() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCrmMember,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.lists() }),
    });
}
