"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SchemaQrCodeDto, SchemaQrCodeScanResultDto } from "@workspace/api-client/core";

import {
    generateOrRegenerateQrCode,
    getQrCodeByMemberId,
    revokeQrCode,
    scanQrCode,
} from "../api/qr-code.api";

/**
 * Получить QR-код участника
 */
export function useQrCode(memberId: string | null) {
    return useQuery({
        queryKey: ["qr-code", memberId],
        queryFn: () => {
            if (!memberId) {
                throw new Error("Member ID is required");
            }
            return getQrCodeByMemberId(memberId);
        },
        enabled: !!memberId,
    });
}

/**
 * Перегенерировать QR-код участника
 */
export function useRegenerateQrCode() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (memberId: string) => generateOrRegenerateQrCode(memberId),
        onSuccess: (data, memberId) => {
            // Инвалидируем кеш QR-кода
            queryClient.invalidateQueries({ queryKey: ["qr-code", memberId] });
        },
    });
}

/**
 * Отозвать QR-код участника
 */
export function useRevokeQrCode() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (memberId: string) => revokeQrCode(memberId),
        onSuccess: (_, memberId) => {
            // Инвалидируем кеш QR-кода
            queryClient.invalidateQueries({ queryKey: ["qr-code", memberId] });
        },
    });
}

/**
 * Сканировать QR-код (валидация)
 */
export function useScanQrCode() {
    return useMutation({
        mutationFn: (encryptedCode: string) => scanQrCode(encryptedCode),
    });
}
