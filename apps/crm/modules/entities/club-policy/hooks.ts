"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SchemaUpdateClubPolicyDto } from "@workspace/api-client/core";

import { getClubPolicy, updateClubPolicy } from "./api";

const clubPolicyKey = ["club-policy"] as const;

export function useClubPolicy() {
    return useQuery({ queryKey: clubPolicyKey, queryFn: getClubPolicy });
}

export function useUpdateClubPolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: SchemaUpdateClubPolicyDto) => updateClubPolicy(body),
        onSuccess: (policy) => queryClient.setQueryData(clubPolicyKey, policy),
    });
}
