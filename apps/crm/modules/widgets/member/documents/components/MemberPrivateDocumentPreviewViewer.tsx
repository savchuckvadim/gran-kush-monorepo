"use client";

import { ThemedSignatureImage } from "@/modules/entities/member";
import { useIdentityDocumentPreview, useSignaturePreview } from "@/modules/entities/member-documents";

export interface IMemberPrivateDocumentPreviewViewerProps {
    memberId: string;
    documentId: string;
    isSignature: boolean;
    type?: string;
    side?: string;
}

export function MemberPrivateDocumentPreviewViewer({
    memberId,
    documentId,
    isSignature,
    type,
    side,
}: IMemberPrivateDocumentPreviewViewerProps) {
    // Hooks must be called unconditionally; disable fetching by passing empty ids for the inactive mode.
    const identityMemberId = isSignature ? "" : memberId;
    const identityDocumentId = isSignature ? "" : documentId;
    const signatureMemberId = isSignature ? memberId : "";

    const identityQuery = useIdentityDocumentPreview(identityMemberId, identityDocumentId);
    const signatureQuery = useSignaturePreview(signatureMemberId);

    if (isSignature) {
        const { previewUrl, isLoading, error } = signatureQuery;

        if (isLoading) {
            return (
                <div className="flex h-[70vh] items-center justify-center text-muted-foreground">
                    Loading...
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex h-[70vh] items-center justify-center text-destructive">
                    {error.message}
                </div>
            );
        }
        if (!previewUrl) return null;

        return (
            <ThemedSignatureImage
                src={previewUrl}
                alt="signature"
                className="mx-auto max-h-[70vh] w-auto rounded-md object-contain"
            />
        );
    }

    const { previewUrl, isLoading, error } = identityQuery;

    if (isLoading) {
        return (
            <div className="flex h-[70vh] items-center justify-center text-muted-foreground">
                Loading...
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex h-[70vh] items-center justify-center text-destructive">
                {error.message}
            </div>
        );
    }
    if (!previewUrl) return null;
  
    console.log("previewUrl", previewUrl);    
    return (
        <img
            src={previewUrl}
            alt={`${type}-${side}`}
            className="mx-auto max-h-[70vh] w-auto rounded-md object-contain"
        />
    );
}

