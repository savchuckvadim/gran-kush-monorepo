import { useQuery } from "@tanstack/react-query";

import { getCabinetMe } from "../api/cabinet-account.api";

/**
 * Ключи кабинета начинаются с принципала `cabinet`: в одном приложении живут и CRM, и кабинет, а
 * общий кэш react-query не должен путать «me» сотрудника с «me» участника.
 */
export const cabinetKeys = {
    all: ["cabinet"] as const,
    me: ["cabinet", "me"] as const,
    memberships: ["cabinet", "memberships"] as const,
    documents: ["cabinet", "documents"] as const,
    club: (slug: string) => ["cabinet", "club", slug] as const,
} as const;

/** `enabled: false` — сессию не спрашивать вовсе (общий планшет-киоск не пользуется чужой сессией). */
export function useCabinetMe(options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: cabinetKeys.me,
        queryFn: getCabinetMe,
        retry: false,
        staleTime: 30_000,
        enabled: options.enabled ?? true,
    });
}
