"use client";
import Link from "next/link";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { MemberSignaturePreview } from "./MemberSignaturePreview";

export interface IMemberSignatureCardProps {
    memberId: string;
    signatureTitle: string;
}
export function MemberSignatureCard({
    memberId,
    signatureTitle,
}: IMemberSignatureCardProps) {
    const toAppPath = useLocalizedLink();
    const signaturePath = toAppPath(
        `${ROUTES.CRM_MEMBER_DETAILS}/${memberId}/documents/signature`
    );
    return (
        <Link href={signaturePath} className="group overflow-hidden rounded-md border bg-muted/30">
            <div className="flex h-40 w-full items-center justify-center bg-muted/30 p-2">
                <MemberSignaturePreview memberId={memberId} />
            </div>
            <div className="border-t px-2 py-1 text-xs text-muted-foreground">{signatureTitle}</div>
        </Link>
    );
}
