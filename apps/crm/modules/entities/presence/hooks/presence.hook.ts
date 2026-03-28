"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getCurrentlyPresent,
    getPresenceSessions,
    getPresenceStats,
    manualCheckIn,
    manualCheckOut,
    type PresenceSessionsFilter,
    type PresenceStatsFilter,
    previewQrCodeScan,
    scanQrCodeForPresence,
} from "../api/presence.api";

const PRESENCE_KEYS = {
    all: ["presence"] as const,
    sessions: (filters?: PresenceSessionsFilter) =>
        [...PRESENCE_KEYS.all, "sessions", filters] as const,
    currentlyPresent: () => [...PRESENCE_KEYS.all, "currently-present"] as const,
    stats: (filters?: PresenceStatsFilter) => [...PRESENCE_KEYS.all, "stats", filters] as const,
};

/**
 * Список сессий присутствия с пагинацией
 */
export function usePresenceSessions(filters?: PresenceSessionsFilter) {
    return useQuery({
        queryKey: PRESENCE_KEYS.sessions(filters),
        queryFn: () => getPresenceSessions(filters),
    });
}

/**
 * Текущие присутствующие участники
 */
export function useCurrentlyPresent() {
    return useQuery({
        queryKey: PRESENCE_KEYS.currentlyPresent(),
        queryFn: getCurrentlyPresent,
        refetchInterval: 30_000, // Автообновление каждые 30 секунд
    });
}

/**
 * Статистика присутствия
 */
export function usePresenceStats(filters?: PresenceStatsFilter) {
    return useQuery({
        queryKey: PRESENCE_KEYS.stats(filters),
        queryFn: () => getPresenceStats(filters),
    });
}

/**
 * Предпросмотр QR-кода (read-only, без записи присутствия).
 * Возвращает информацию об участнике + предлагаемое действие.
 */
export function useQrPreview() {
    return useMutation({
        mutationFn: (encryptedCode: string) => previewQrCodeScan(encryptedCode),
    });
}

/**
 * Сканирование QR (вход/выход)
 */
export function useQrScan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (encryptedCode: string) => scanQrCodeForPresence(encryptedCode),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PRESENCE_KEYS.all });
        },
    });
}

/**
 * Ручной чек-ин
 */
export function useManualCheckIn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (memberId: string) => manualCheckIn(memberId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PRESENCE_KEYS.all });
        },
    });
}

/**
 * Ручной чек-аут
 */
export function useManualCheckOut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (memberId: string) => manualCheckOut(memberId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PRESENCE_KEYS.all });
        },
    });
}
