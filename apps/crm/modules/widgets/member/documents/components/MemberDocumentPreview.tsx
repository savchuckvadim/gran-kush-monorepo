"use client";

import { useIdentityDocumentPreview } from "@/modules/entities/member-documents/api";

interface MemberDocumentPreviewProps {
    memberId: string;
    documentId: string;
    type: string;
    side: string;
    alt: string;
}

export function MemberDocumentPreview({
    memberId,
    documentId,
    type,
    side,
    alt,
}: MemberDocumentPreviewProps) {
    const { previewUrl, isLoading, error } = useIdentityDocumentPreview(memberId, documentId);

    if (error) {
        return (
            <div className="flex h-40 w-full items-center justify-center bg-muted/30 p-2 text-sm text-muted-foreground">
                {error.message}
            </div>
        );
    }

    if (isLoading || !previewUrl) {
        return (
            <div className="flex h-40 w-full items-center justify-center bg-muted/30 p-2">
                <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <img src={previewUrl} alt={alt} className="h-full w-full object-contain" />
    );
}



