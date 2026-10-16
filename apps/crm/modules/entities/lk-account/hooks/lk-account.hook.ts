import { useQuery } from "@tanstack/react-query";

import { getLkMe } from "../api/lk-account.api";

/**
 * Ключи кабинета начинаются с принципала `lk`: в одном приложении живут и CRM, и кабинет, а
 * общий кэш react-query не должен путать «me» сотрудника с «me» участника.
 */
export const lkKeys = {
    all: ["lk"] as const,
    me: ["lk", "me"] as const,
    memberships: ["lk", "memberships"] as const,
    documents: ["lk", "documents"] as const,
    club: (slug: string) => ["lk", "club", slug] as const,
} as const;

export function useLkMe() {
    return useQuery({
        queryKey: lkKeys.me,
        queryFn: getLkMe,
        retry: false,
        staleTime: 30_000,
    });
}
