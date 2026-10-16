import { useMutation, useQueryClient } from "@tanstack/react-query";

import { lkKeys } from "@/modules/entities/lk-account";

import {
    deleteDocument,
    deleteSignature,
    putSignature,
    revokeDocument,
    revokeSignature,
    shareDocument,
    shareSignature,
    uploadDocument,
} from "../api/lk-passport.api";

/**
 * Любое действие в «Моём паспорте» меняет список документов (кто что видит), а удаление и показ
 * ещё и то, что клуб видит в своей карточке участника, поэтому сбрасывается вся ветка кабинета.
 */
function useRefreshPassport() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: lkKeys.all });
}

export function useUploadDocument() {
    const refresh = useRefreshPassport();
    return useMutation({ mutationFn: uploadDocument, onSuccess: refresh });
}

export function useDeleteDocument() {
    const refresh = useRefreshPassport();
    return useMutation({ mutationFn: deleteDocument, onSuccess: refresh });
}

/** Переключатель показа: включить — показать клубу, выключить — отозвать. */
export function useToggleDocumentShare() {
    const refresh = useRefreshPassport();
    return useMutation({
        mutationFn: (input: { documentId: string; memberId: string; shared: boolean }) =>
            input.shared
                ? shareDocument(input.documentId, input.memberId)
                : revokeDocument(input.documentId, input.memberId),
        onSuccess: refresh,
    });
}

export function usePutSignature() {
    const refresh = useRefreshPassport();
    return useMutation({ mutationFn: putSignature, onSuccess: refresh });
}

export function useDeleteSignature() {
    const refresh = useRefreshPassport();
    return useMutation({ mutationFn: deleteSignature, onSuccess: refresh });
}

export function useToggleSignatureShare() {
    const refresh = useRefreshPassport();
    return useMutation({
        mutationFn: (input: { memberId: string; shared: boolean }) =>
            input.shared ? shareSignature(input.memberId) : revokeSignature(input.memberId),
        onSuccess: refresh,
    });
}
