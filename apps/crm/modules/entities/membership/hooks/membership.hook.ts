import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SchemaConfirmMyMembershipDto } from "@workspace/api-client/core";

import { lkKeys } from "@/modules/entities/lk-account";

import {
    confirmMembership,
    declineMembership,
    leaveMembership,
    listAccountDocuments,
    listMyMemberships,
} from "../api/membership.api";

export function useMyMemberships() {
    return useQuery({
        queryKey: lkKeys.memberships,
        queryFn: listMyMemberships,
        staleTime: 15_000,
    });
}

export function useAccountDocuments(enabled = true) {
    return useQuery({
        queryKey: lkKeys.documents,
        queryFn: listAccountDocuments,
        enabled,
    });
}

/** Любое изменение членства меняет список клубов и данные аккаунта, поэтому кэш сбрасывается разом. */
function useRefreshAfterChange() {
    const queryClient = useQueryClient();
    return () => Promise.all([queryClient.invalidateQueries({ queryKey: lkKeys.all })]);
}

export function useConfirmMembership() {
    const refresh = useRefreshAfterChange();
    return useMutation({
        mutationFn: (input: { memberId: string; selection: SchemaConfirmMyMembershipDto }) =>
            confirmMembership(input.memberId, input.selection),
        onSuccess: refresh,
    });
}

export function useDeclineMembership() {
    const refresh = useRefreshAfterChange();
    return useMutation({
        mutationFn: (memberId: string) => declineMembership(memberId),
        onSuccess: refresh,
    });
}

export function useLeaveMembership() {
    const refresh = useRefreshAfterChange();
    return useMutation({
        mutationFn: (memberId: string) => leaveMembership(memberId),
        onSuccess: refresh,
    });
}
