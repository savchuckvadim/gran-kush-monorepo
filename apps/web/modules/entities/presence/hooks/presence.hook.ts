"use client";

import { useQuery } from "@tanstack/react-query";

import { getMyPresenceHistory, getMyPresenceStatus, type PresenceHistoryParams } from "../api/presence.api";

export const presenceKeys = {
    all: ["presence"] as const,
    status: () => [...presenceKeys.all, "status"] as const,
    history: (params?: PresenceHistoryParams) => [...presenceKeys.all, "history", params] as const,
};

/**
 * Get current member's presence status
 */
export function useMyPresenceStatus() {
    return useQuery({
        queryKey: presenceKeys.status(),
        queryFn: getMyPresenceStatus,
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 60 * 1000, // Refetch every minute
    });
}

/**
 * Get current member's presence history
 */
export function useMyPresenceHistory(params: PresenceHistoryParams = {}) {
    return useQuery({
        queryKey: presenceKeys.history(params),
        queryFn: () => getMyPresenceHistory(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
