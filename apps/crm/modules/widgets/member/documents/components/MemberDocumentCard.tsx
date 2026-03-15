'use client'
import { IdentityDocument } from "@/modules/entities/member";
import Link from "next/link";
import { MemberDocumentPreview } from "./MemberDocumentPreview";

export interface IMemberDocumentCardProps {
    memberId: string;
    document: IdentityDocument;
    locale: string;
}

export function MemberDocumentCard({ memberId, document, locale }: IMemberDocumentCardProps) {
    return (
        <Link
            key={document.id}
            href={`/${locale}/crm/members/${memberId}/documents/${document.id}`}
            className="group overflow-hidden rounded-md border bg-muted/30"
        >
            <div className="flex h-40 w-full items-center justify-center bg-muted/30 p-2">
                <MemberDocumentPreview
                    memberId={memberId}
                    documentId={document.id}
                    type={document.type}
                    side={document.side}
                    alt={`${document.type}-${document.side}`}
                />
            </div>
            <div className="border-t px-2 py-1 text-xs text-muted-foreground">
                {document.type} · {document.side}
            </div>
        </Link>
    )
}