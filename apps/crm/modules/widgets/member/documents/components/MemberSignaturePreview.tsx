'use client'

import { ThemedSignatureImage } from "@/modules/entities/member";
import { useSignaturePreview } from "@/modules/entities/member-documents";

interface IMemberSignaturePreviewProps {
    memberId: string;
}
export function MemberSignaturePreview({ memberId }: IMemberSignaturePreviewProps) {
    const { previewUrl, isLoading, error } = useSignaturePreview(memberId);

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
        <ThemedSignatureImage src={previewUrl} alt="signature" className="h-full w-full object-contain" />
    );
}