'use client'

import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@workspace/ui";

import { ThemedSignatureImage,useMemberDetails } from "@/modules/entities/member";
import { useIdentityDocumentPreview, useSignaturePreview } from "@/modules/entities/member-documents";

interface Props {
    locale: string;
    memberId: string;
    documentId: string;
    backToDocumentsLabel: string;
    downloadLabel: string;
    previewTitle: string;
}

function DocumentImage({ memberId, documentId, type, side }: { memberId: string; documentId: string; type?: string; side?: string }) {
    const { previewUrl, isLoading, error } = useIdentityDocumentPreview(memberId, documentId);

    if (isLoading) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Loading...</div>;
    if (error) return <div className="flex h-[60vh] items-center justify-center text-destructive">{error.message}</div>;
    if (!previewUrl) return null;

    return (
        <img
            src={previewUrl}
            alt={`${type}-${side}`}
            className="mx-auto max-h-[70vh] w-auto rounded-md object-contain"
        />
    );
}

function SignatureImage({ memberId }: { memberId: string }) {
    const { previewUrl, isLoading, error } = useSignaturePreview(memberId);

    if (isLoading) return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Loading...</div>;
    if (error) return <div className="flex h-[60vh] items-center justify-center text-destructive">{error.message}</div>;
    if (!previewUrl) return null;

    return (
        <ThemedSignatureImage
            src={previewUrl}
            alt="signature"
            className="mx-auto max-h-[70vh] w-auto rounded-md object-contain"
        />
    );
}

export function MemberDocumentPreviewClient({
    locale,
    memberId,
    documentId,
    backToDocumentsLabel,
    downloadLabel,
    previewTitle,
}: Props) {
    const { data: member, isLoading, error } = useMemberDetails(memberId);

    if (isLoading) {
        return <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading...</div>;
    }
    if (error || !member) {
        notFound();
    }

    const isSignature = documentId === "signature";
    const identityDocument = member.identityDocuments.find((doc) => doc.id === documentId);

    if (!isSignature && !identityDocument) notFound();
    if (isSignature && !member.signature) notFound();

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
                    <Button variant="outline" asChild>
                        <Link href={`/${locale}/crm/members/${memberId}/documents`}>{backToDocumentsLabel}</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <a href="#" download onClick={(e) => e.preventDefault()}>
                            {downloadLabel}
                        </a>
                    </Button>
                </div>
            </div>

            <div className="rounded-lg border bg-background p-4">
                {isSignature ? (
                    <SignatureImage memberId={memberId} />
                ) : (
                    <DocumentImage
                        memberId={memberId}
                        documentId={identityDocument!.id}
                        type={identityDocument?.type}
                        side={identityDocument?.side}
                    />
                )}
            </div>
        </div>
    );
}
