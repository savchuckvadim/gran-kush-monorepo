'use client'
import { useTranslations } from "next-intl";

import { Link, Pencil } from "lucide-react";

import { Button } from "@workspace/ui";

import { CrmMemberDetails } from "@/modules/entities/member";

import { MemberDocumentCard } from "./components/MemberDocumentCard";
import { MemberSignatureCard } from "./components/MemberSignatureCard";

export interface IMemberDocumentsProps {
    member: CrmMemberDetails;
    locale: string;

}
export function MemberDocuments({
    member, locale,
}: IMemberDocumentsProps) {
    const t = useTranslations("crm.members");


    const signatureTitle = t("signatureTitle")
    const documentsTitle = t("documents")
    const openDocumentsRoute = t("openDocumentsRoute")
    return (
        <section className="rounded-lg border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-medium">{documentsTitle}</h2>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/${locale}/crm/members/${member.id}/documents`}>
                        <span className="inline-flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            {openDocumentsRoute}
                        </span>
                    </Link>
                </Button>
            </div>
            {member.identityDocuments.length > 0 && (
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {member.identityDocuments.map((doc) => (
                        <MemberDocumentCard
                            key={doc.id}
                            memberId={member.id}
                            document={doc}
                            locale={locale}
                        />
                    ))}
                    {member.signature && (
                        <MemberSignatureCard
                  
                            memberId={member.id}
                            locale={locale}
                            signatureTitle={signatureTitle}
                        />
                    )}
                </div>
            )}

        </section>
    )
}