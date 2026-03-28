"use client";
import NextLink from "next/link";
import { useTranslations } from "next-intl";

import { Pencil } from "lucide-react";

import { Button } from "@workspace/ui";

import { CrmMemberDetails } from "@/modules/entities/member";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { MemberDocumentCard } from "./components/MemberDocumentCard";
import { MemberSignatureCard } from "./components/MemberSignatureCard";

export interface IMemberDocumentsProps {
    member: CrmMemberDetails;
}
export function MemberDocuments({ member }: IMemberDocumentsProps) {
    const t = useTranslations("crm.members");
    const toAppPath = useLocalizedLink();
    const memberDocumentsPath = toAppPath(
        `${ROUTES.CRM_MEMBER_DETAILS}/${member.id}/documents`
    );

    const signatureTitle = t("signatureTitle");
    const documentsTitle = t("documents");
    const openDocumentsRoute = t("openDocumentsRoute");
    return (
        <section className="rounded-lg border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-medium">{documentsTitle}</h2>
                <Button variant="outline" size="sm" asChild>
                    <NextLink href={memberDocumentsPath}>
                        <span className="inline-flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            {openDocumentsRoute}
                        </span>
                    </NextLink>
                </Button>
            </div>
            {member.identityDocuments.length > 0 && (
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {member.identityDocuments.map((doc) => (
                        <MemberDocumentCard
                            key={doc.id}
                            memberId={member.id}
                            document={doc}
                        />
                    ))}
                    {member.signature && (
                        <MemberSignatureCard
                            memberId={member.id}
                            signatureTitle={signatureTitle}
                        />
                    )}
                </div>
            )}
        </section>
    );
}
