'use client'
import Link from "next/link";

import { MemberSignaturePreview } from "./MemberSignaturePreview";


export interface IMemberSignatureCardProps {
    memberId: string;
    locale: string;
    signatureTitle: string;
}
export function MemberSignatureCard({ memberId, locale, signatureTitle }: IMemberSignatureCardProps) {
  
    return (
        <Link
            href={`/${locale}/crm/members/${memberId}/documents/signature`}
            className="group overflow-hidden rounded-md border bg-muted/30"
        >
            <div className="flex h-40 w-full items-center justify-center bg-muted/30 p-2">
                <MemberSignaturePreview memberId={memberId} />
            </div>
            <div className="border-t px-2 py-1 text-xs text-muted-foreground">
                {signatureTitle}
            </div>
        </Link>
    )
}