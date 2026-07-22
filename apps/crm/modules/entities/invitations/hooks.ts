"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SchemaCreateInvitationDto } from "@workspace/api-client/core";

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
