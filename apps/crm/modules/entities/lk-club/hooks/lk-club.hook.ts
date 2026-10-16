import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { lkKeys } from "@/modules/entities/lk-account";

import {
    getMyPresenceHistory,
    getMyPresenceStatus,
    getMyQrCode,
    regenerateMyQrCode,
} from "../api/lk-club.api";

/** Все запросы клуба ключуются slug: у участника нескольких клубов у каждого свой QR и своё присутствие. */
const clubKey = (slug: string, part: string) => [...lkKeys.club(slug), part] as const;

export function useMyQrCode(slug: string) {
    return useQuery({
        queryKey: clubKey(slug, "qr"),
        queryFn: getMyQrCode,
        staleTime: 60_000,
        retry: false,
    });
}

export function useRegenerateQrCode(slug: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: regenerateMyQrCode,
        onSuccess: (qr) => queryClient.setQueryData(clubKey(slug, "qr"), qr),
    });
}

/** Статус «в клубе» меняется на стойке, а не здесь: опрашиваем, пока страница открыта. */
export function useMyPresenceStatus(slug: string) {
    return useQuery({
        queryKey: clubKey(slug, "presence"),
        queryFn: getMyPresenceStatus,
        refetchInterval: 15_000,
        retry: false,
    });
}

export function useMyPresenceHistory(slug: string, limit = 5) {
    return useQuery({
        queryKey: clubKey(slug, `history-${limit}`),
        queryFn: () => getMyPresenceHistory(limit),
        retry: false,
    });
}
