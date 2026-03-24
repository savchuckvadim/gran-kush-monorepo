"use client";

import Link from "next/link";
import { notFound } from "next/navigation";

import { useMemberDetails } from "@/modules/entities/member";
import type { IdentityDocument } from "@/modules/entities/member-documents";
import { MemberPrivateDocumentPreviewActions, MemberPrivateDocumentPreviewViewer } from "@/modules/widgets/member/documents/components";

export interface IMemberDocumentPreviewPageProps {
    locale: string;
    memberId: string;
    documentType: string;
    // backToProfile: string;
    // downloadLabel: string;
    previewTitle: string;
}

export function MemberDocumentPreviewPage({
    locale,
    memberId,
    documentType,
    // backToProfile,
    // downloadLabel,
    previewTitle,
}: IMemberDocumentPreviewPageProps) {
    const { data: member, isLoading, error } = useMemberDetails(memberId);
    
    if (isLoading) {
        return <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading...</div>;
    }

    if (error || !member) {
        notFound();
    }

    const isSignature = documentType === "signature";
    const identityDocument = member.identityDocuments.find((doc) => doc.id === documentType) ?? null;
    if (!isSignature && !identityDocument) notFound();
    if (isSignature && !member.signature) notFound();

    const identityDoc = identityDocument as IdentityDocument | null;

    const isIdentityDocSide = (side: string): side is "first" | "second" => side === "first" || side === "second";

    const identityDocumentForActions =
        identityDoc && isIdentityDocSide(identityDoc.side)
            ? {
                  id: identityDoc.id,
                  type: identityDoc.type,
                  side: identityDoc.side,
              }
            : undefined;

    // Action component uses downloadLabel/backToDocumentsLabel and already computes preview URLs.
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">{previewTitle}</h1>
                    <p className="text-sm text-muted-foreground">
                        <Link
                            href={`/${locale}/crm/members/${memberId}`}
                            className="font-medium text-foreground hover:underline"
                        >
                            {member.name} {member.surname ?? ""}
                        </Link>{" "}
                        · {member.email}
                    </p>
                </div>

                <div className="flex gap-2">
                    <MemberPrivateDocumentPreviewActions
                     
                        memberId={memberId}
                        documentId={documentType}
                        isSignature={isSignature}
                        
                        identityDocument={identityDocumentForActions}
                        // downloadLabel={downloadLabel}
                    />
                </div>
            </div>

            <div className="rounded-lg border bg-background p-4">
                <MemberPrivateDocumentPreviewViewer
                    memberId={memberId}
                    documentId={documentType}
                    isSignature={isSignature}
                    type={identityDocument?.type}
                    side={identityDocument?.side}
                />
            </div>
        </div>
    );
}

