"use client";
import { useTranslations } from "next-intl";

import { CrmMemberDetails } from "@/modules/entities/member";
import {
    getIdentityDocumentPreviewUrl,
    getSignaturePreviewUrl,
} from "@/modules/entities/member-documents";
import { MemberDocumentEditModal } from "@/modules/features/members";

import { MemberDocumentCard } from "./components/MemberDocumentCard";
import { MemberSignatureCard } from "./components/MemberSignatureCard";

export interface IMemberDocumentsProps {
    member: CrmMemberDetails;
}
export function MemberDocuments({ member }: IMemberDocumentsProps) {
    const t = useTranslations("crm.members");

    const signatureTitle = t("signatureTitle");
    const documentsTitle = t("documents");
    // Until the account owner confirms, the club neither sees nor replaces the account's files
    const awaitingConsent = member.consentStatus === "pending";

    const frontDocument = member.documents.find(
        (doc) => doc.side === "front" || doc.side === "single"
    );
    const backDocument = member.documents.find((doc) => doc.side === "back");

    return (
        <section className="rounded-lg border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-medium">{documentsTitle}</h2>
            </div>
            {awaitingConsent && (
                <p className="text-sm text-muted-foreground">{t("consent.pendingHint")}</p>
            )}
            {(member.documents.length > 0 || member.hasSignature) && (
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {member.documents.map((doc) => (
                        <MemberDocumentCard key={doc.id} memberId={member.id} document={doc} />
                    ))}
                    {member.hasSignature && (
                        <MemberSignatureCard memberId={member.id} signatureTitle={signatureTitle} />
                    )}
                </div>
            )}
            {!awaitingConsent && (
                <div className="flex flex-wrap gap-2">
                    <MemberDocumentEditModal
                        memberId={member.id}
                        documentId={frontDocument?.id ?? ""}
                        isSignature={false}
                        payloadKey="documentFirst"
                        initialDocumentType={frontDocument?.type ?? "passport"}
                        currentPreviewUrl={
                            frontDocument
                                ? getIdentityDocumentPreviewUrl(member.id, frontDocument.id)
                                : ""
                        }
                        triggerLabel={t("documentFront")}
                    />
                    <MemberDocumentEditModal
                        memberId={member.id}
                        documentId={backDocument?.id ?? ""}
                        isSignature={false}
                        payloadKey="documentSecond"
                        initialDocumentType={
                            backDocument?.type ?? frontDocument?.type ?? "passport"
                        }
                        currentPreviewUrl={
                            backDocument
                                ? getIdentityDocumentPreviewUrl(member.id, backDocument.id)
                                : ""
                        }
                        triggerLabel={t("documentBack")}
                    />
                    <MemberDocumentEditModal
                        memberId={member.id}
                        documentId="signature"
                        isSignature
                        currentPreviewUrl={
                            member.hasSignature ? getSignaturePreviewUrl(member.id) : ""
                        }
                        triggerLabel={signatureTitle}
                    />
                </div>
            )}
        </section>
    );
}
