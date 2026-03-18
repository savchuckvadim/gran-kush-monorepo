"use client";

import { useQuery } from "@tanstack/react-query";

import { getMyMemberInfo } from "../api/member.api";

export const memberKeys = {
    all: ["member"] as const,
    me: () => [...memberKeys.all, "me"] as const,
};

/**
 * Get current member information
 */
export function useMyMemberInfo() {
    return useQuery({
        queryKey: memberKeys.me(),
        queryFn: getMyMemberInfo,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
