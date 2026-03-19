'use client'

import { useMemberDetails } from "@/modules/entities/member";
import { MemberDocuments, MemberHeader, MemberProfileInfo, MemberQrCodeCard } from "@/modules/widgets/member";

export interface IMemberPageProps {
    memberId: string;
    locale: string;
    // signatureTitle: string;
    // documentsTitle: string;
    // openDocumentsRoute: string;
}
export function MemberPage({ memberId, locale, }: IMemberPageProps) {
    const { data: member, isLoading, error } = useMemberDetails(memberId);
    if (isLoading) {
        return <div>Loading...</div>
    }
    if (error) {
        return <div>Error: {error.message}</div>
    }
    if (!member) {
        return <div>Member not found</div>
    }
    return (
        <div className="space-y-6">

            <MemberHeader member={member} locale={locale} />

            <div className="grid gap-4 lg:grid-cols-2">
                <MemberProfileInfo member={member} />
                <MemberQrCodeCard memberId={memberId} />
            </div>

            <MemberDocuments member={member} locale={locale}  />
        </div>
    )
}