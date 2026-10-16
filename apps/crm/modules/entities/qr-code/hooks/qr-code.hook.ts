"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMemberQrCode, reissueMemberQrCode, revokeMemberQrCode } from "../api/qr-code.api";

const memberQrKey = (memberId: string) => ["qr-code", memberId] as const;

export function useMemberQrCode(memberId: string) {
    return useQuery({
        queryKey: memberQrKey(memberId),
        queryFn: () => getMemberQrCode(memberId),
    });
}

/** Ответ — уже новый код: кладём его в кеш, без повторного запроса. */
export function useReissueMemberQrCode(memberId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => reissueMemberQrCode(memberId),
        onSuccess: (qr) => queryClient.setQueryData(memberQrKey(memberId), qr),
    });
}

export function useRevokeMemberQrCode(memberId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => revokeMemberQrCode(memberId),
        onSuccess: () => queryClient.setQueryData(memberQrKey(memberId), null),
    });
}
