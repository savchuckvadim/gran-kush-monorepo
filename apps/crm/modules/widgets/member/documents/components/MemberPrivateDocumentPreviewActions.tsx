"use client";

import {
    getIdentityDocumentPreviewUrl,
    getSignaturePreviewUrl,
} from "@/modules/entities/member-documents";
import { MemberDocumentEditModal } from "@/modules/features/members";
import { BackToMememberProfile } from "@/modules/shared";

export interface IMemberPrivateDocumentPreviewActionsProps {
    memberId: string;
    documentId: string;
    isSignature: boolean;
    identityDocument?: {
        id: string;
        type: string;
        side: "first" | "second";
    };
}

export function MemberPrivateDocumentPreviewActions({
    memberId,
    documentId,
    isSignature,
    identityDocument,
}: IMemberPrivateDocumentPreviewActionsProps) {
    return (
        <div className="flex gap-2">
            <BackToMememberProfile memberId={memberId} />

            {!isSignature && identityDocument ? (
                <MemberDocumentEditModal
                    documentId={documentId}
                    memberId={memberId}
                    isSignature={false}
                    payloadKey={
                        identityDocument.side === "first" ? "documentFirst" : "documentSecond"
                    }
                    initialDocumentType={identityDocument.type}
                    currentPreviewUrl={getIdentityDocumentPreviewUrl(memberId, identityDocument.id)}
                />
            ) : null}

            {isSignature ? (
                <MemberDocumentEditModal
                    memberId={memberId}
                    documentId={documentId}
                    isSignature={true}
                    currentPreviewUrl={getSignaturePreviewUrl(memberId)}
                />
            ) : null}
        </div>
    );
}
