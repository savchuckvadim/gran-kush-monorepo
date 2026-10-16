"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { memberKeys } from "@/modules/entities/member";

import { getMemberLimit, updateMemberLimit } from "../api/member-limit.api";

const limitKey = (memberId: string) => [...memberKeys.detail(memberId), "monthly-limit"] as const;

export function useMemberLimit(memberId: string) {
    return useQuery({ queryKey: limitKey(memberId), queryFn: () => getMemberLimit(memberId) });
}

export function useUpdateMemberLimit(memberId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (grams: number | null) => updateMemberLimit(memberId, grams),
        onSuccess: (limit) => queryClient.setQueryData(limitKey(memberId), limit),
    });
}
