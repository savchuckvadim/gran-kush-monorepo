"use client";

import {  useQuery } from "@tanstack/react-query";

import {
    getCrmMemberById,
    getCrmMembers,
} from "../api/member.api";
import { CrmMemberListFilters } from "../type/member.type";

// Query keys
export const memberKeys = {
    all: ["crm-members"] as const,
    lists: () => [...memberKeys.all, "list"] as const,
    list: (limit?: number, filters?: CrmMemberListFilters) =>
        [...memberKeys.lists(), limit, filters] as const,
    details: () => [...memberKeys.all, "detail"] as const,
    detail: (id: string) => [...memberKeys.details(), id] as const,
};

// Hook for fetching members list
export function useCrmMembers(limit: number = 100, filters?: CrmMemberListFilters) {
    return useQuery({
        queryKey: memberKeys.list(limit, filters),
        queryFn: () => getCrmMembers(limit, filters),
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

