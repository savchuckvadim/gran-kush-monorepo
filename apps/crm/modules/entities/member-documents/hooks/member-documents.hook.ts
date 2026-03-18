"use client";

import { useEffect, useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { memberKeys } from "@/modules/entities/member";
import { CrmMemberDetails } from "@/modules/entities/member";

import {
    getIdentityDocumentPreview,
    getSignaturePreview,
    updateCrmMemberFiles,
    type UpdateCrmMemberFilesPayload,
} from "../api/member-documents.api";

// Query keys for member documents
export const memberDocumentsKeys = {
    all: ["crm-member-documents"] as const,
    byMember: (memberId: string) => [...memberDocumentsKeys.all, "member", memberId] as const,
    previews: () => [...memberDocumentsKeys.all, "preview"] as const,
    identityDocumentPreview: (memberId: string, documentId: string) =>
        [...memberDocumentsKeys.previews(), "identity", memberId, documentId] as const,
    signaturePreview: (memberId: string) =>
        [...memberDocumentsKeys.previews(), "signature", memberId] as const,
};

// Helper to convert blob to object URL with cleanup
function useBlobUrl(blob: Blob | null | undefined): string | null {
    return useMemo(() => {
        if (!blob) return null;
        const url = URL.createObjectURL(blob);
        return url;
    }, [blob]);
}

// Hook for fetching identity document preview with caching
export function useIdentityDocumentPreview(memberId: string, documentId: string) {
    const query = useQuery({
        queryKey: memberDocumentsKeys.identityDocumentPreview(memberId, documentId),
        queryFn: () => getIdentityDocumentPreview(memberId, documentId),
        enabled: !!memberId && !!documentId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    const blobUrl = useBlobUrl(query.data);

    // Cleanup blob URL on unmount or when blob changes
    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);

    return {
        ...query,
        previewUrl: blobUrl,
    };
}

// Hook for fetching signature preview with caching
export function useSignaturePreview(memberId: string) {
    const query = useQuery({
        queryKey: memberDocumentsKeys.signaturePreview(memberId),
        queryFn: () => getSignaturePreview(memberId),
        enabled: !!memberId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    const blobUrl = useBlobUrl(query.data);

    // Cleanup blob URL on unmount or when blob changes
    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);

    return {
        ...query,
        previewUrl: blobUrl,
    };
}

// Hook for updating member files (documents/signature)
export function useUpdateCrmMemberFiles() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            memberId,
            payload,
        }: {
            memberId: string;
            payload: UpdateCrmMemberFilesPayload;
        }) => updateCrmMemberFiles(memberId, payload),
        onSuccess: (data, variables) => {
            // Invalidate and refetch member details to get updated documents
            queryClient.invalidateQueries({ queryKey: memberKeys.detail(variables.memberId) });
            // Also invalidate list
            queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
            // Invalidate member documents cache
            queryClient.invalidateQueries({ queryKey: memberDocumentsKeys.byMember(variables.memberId) });
            // Invalidate preview caches for this member
            queryClient.invalidateQueries({
                queryKey: [...memberDocumentsKeys.previews(), variables.memberId],
            });
            // Update cache directly with returned data
            queryClient.setQueryData<CrmMemberDetails>(memberKeys.detail(variables.memberId), data);
        },
    });
}
