"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SchemaCreateInvitationDto } from "@workspace/api-client/core";

import { findEmployeeMe } from "@/modules/entities/auth";
import { useCabinetMe } from "@/modules/entities/cabinet-account";

import { createInvitation, listInvitations, revokeInvitation } from "./api";

const invitationKeys = {
    all: ["invitations"] as const,
};

export function useInvitations(enabled = true) {
    return useQuery({
        queryKey: invitationKeys.all,
        queryFn: () => listInvitations(),
        enabled,
    });
}

export function useCreateInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: SchemaCreateInvitationDto) => createInvitation(body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
    });
}

export function useRevokeInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => revokeInvitation(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
    });
}

/** Открытая сессия: чей адрес и подтверждён ли он (неподтверждённая сессия владельца не доказывает). */
export interface OpenSession {
    email: string;
    emailConfirmed: boolean;
}

/**
 * Какие сессии уже открыты в браузере: приглашение можно принять любой из них, если адрес
 * аккаунта совпадает с адресом приглашения и подтверждён. Сессия CRM предпочтительнее.
 */
export function useOpenSessions(): {
    isLoading: boolean;
    crm: OpenSession | null;
    cabinet: OpenSession | null;
} {
    const crm = useQuery({
        queryKey: ["invitation-session", "crm"],
        queryFn: findEmployeeMe,
        retry: false,
        staleTime: 30_000,
    });
    const cabinet = useCabinetMe();
    return {
        isLoading: crm.isLoading || cabinet.isLoading,
        crm: crm.data ? { email: crm.data.email, emailConfirmed: crm.data.emailConfirmed } : null,
        cabinet: cabinet.data
            ? { email: cabinet.data.email, emailConfirmed: cabinet.data.emailConfirmed }
            : null,
    };
}
