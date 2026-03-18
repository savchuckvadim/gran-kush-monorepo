"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    type CrmMemberDetails,
    type CrmMemberListItem,
    getCrmMemberById,
    getCrmMembers,
    updateCrmMember,
} from "../api/member.api";

// Query keys
export const memberKeys = {
    all: ["crm-members"] as const,
    lists: () => [...memberKeys.all, "list"] as const,
    list: (limit?: number) => [...memberKeys.lists(), limit] as const,
    details: () => [...memberKeys.all, "detail"] as const,
    detail: (id: string) => [...memberKeys.details(), id] as const,
};

// Hook for fetching members list
export function useCrmMembers(limit: number = 100) {
    return useQuery({
        queryKey: memberKeys.list(limit),
        queryFn: () => getCrmMembers(limit),
    });
}

// Hook for fetching single member details
export function useMemberDetails(memberId: string) {
    return useQuery({
        queryKey: memberKeys.detail(memberId),
        queryFn: () => getCrmMemberById(memberId),
        enabled: !!memberId,
    });
}

// Hook for updating member profile
export function useUpdateCrmMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            memberId,
            payload,
        }: {
            memberId: string;
            payload: Parameters<typeof updateCrmMember>[1];
        }) => updateCrmMember(memberId, payload),
        onSuccess: (data, variables) => {
            // Invalidate and refetch member details
            queryClient.invalidateQueries({ queryKey: memberKeys.detail(variables.memberId) });
            // Also invalidate list to update any displayed data
            queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
            // Optionally update cache directly with returned data
            queryClient.setQueryData<CrmMemberDetails>(memberKeys.detail(variables.memberId), data);
        },
    });
}

