"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMyQrCode, regenerateMyQrCode } from "../api/qr-code.api";

export const qrCodeKeys = {
    all: ["qrCode"] as const,
    my: () => [...qrCodeKeys.all, "my"] as const,
};

/**
 * Get current member's QR code
 */
export function useMyQrCode() {
    return useQuery({
        queryKey: qrCodeKeys.my(),
        queryFn: getMyQrCode,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Regenerate QR code mutation
 */
export function useRegenerateQrCode() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: regenerateMyQrCode,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qrCodeKeys.my() });
        },
    });
}
