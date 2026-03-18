"use client";

import { useQuery } from "@tanstack/react-query";

import { authKeys, getEmployeeMe } from "@/modules/entities/auth";

export function useMeEmployee() {
    return useQuery({
        queryKey: authKeys.current(),
        queryFn: getEmployeeMe,
        staleTime: 5 * 60 * 1000,
        retry: (failureCount, error: unknown) => {
            const status =
                typeof error === "object" && error
                    ? (error as { status?: number }).status
                    : undefined;
            if (status === 401 || status === 403) return false;
            return failureCount < 2;
        },
    });
}
