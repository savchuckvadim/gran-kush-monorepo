"use client";

import { useQuery } from "@tanstack/react-query";

import { authKeys } from "@/modules/entities/auth";
import { getMyMemberInfo } from "@/modules/entities/member/api/member.api";

export function useCurrentUserQuery(enabled: boolean) {
    return useQuery({
        queryKey: authKeys.current(),
        queryFn: getMyMemberInfo,
        enabled,
        retry: (failureCount, error: unknown) => {
            const status =
                typeof error === "object" && error
                    ? (error as { status?: number }).status
                    : undefined;
            if (status === 401 || status === 403) return false;
            return failureCount < 2;
        },
        staleTime: 5 * 60 * 1000,
    });
}
