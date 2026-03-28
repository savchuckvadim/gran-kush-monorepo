"use client";
import Link from "next/link";

import { IdentityDocument } from "@/modules/entities/member";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { MemberDocumentPreview } from "./MemberDocumentPreview";

export interface IMemberDocumentCardProps {
    memberId: string;
    document: IdentityDocument;
}

export function MemberDocumentCard({ memberId, document }: IMemberDocumentCardProps) {
    const toAppPath = useLocalizedLink();
    const documentPath = toAppPath(
        `${ROUTES.CRM_MEMBER_DETAILS}/${memberId}/documents/${document.id}`
    );
    return (
        <Link
            key={document.id}
            href={documentPath}
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
    );
}
