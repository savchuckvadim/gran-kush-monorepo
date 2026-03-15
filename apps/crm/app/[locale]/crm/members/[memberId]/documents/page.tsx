import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Button } from "@workspace/ui";

import { ThemedSignatureImage } from "@/modules/entities/member/ui/themed-signature-image";
import { MemberDocumentEditModal } from "@/modules/features/members/member-document-edit-modal";
import { getCrmMemberById } from "@/modules/entities/member/api/member.api";
import {
    getIdentityDocumentPreviewUrl,
    getSignaturePreviewUrl,
} from "@/modules/entities/member-documents/api/member-documents.api";

export default async function CrmMemberDocumentsPage({
    params,
}: {
    params: Promise<{ locale: string; memberId: string }>;
}) {
    const { locale, memberId } = await params;
    const t = await getTranslations("crm.members");
    const member = await getCrmMemberById(memberId);

    if (!member) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{t("documentsRouteTitle")}</h1>
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
                <Button variant="outline" asChild>
                    <Link href={`/${locale}/crm/members/${memberId}`}>{t("backToProfile")}</Link>
                </Button>
            </div>

            <section className="rounded-lg border bg-background p-4">
                <h2 className="mb-3 text-base font-medium">{t("documents")}</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {member.identityDocuments.map((doc) => (
                        <div key={doc.id} className="overflow-hidden rounded-md border">
                            <div className="flex h-44 items-center justify-center bg-muted/30 p-2">
                                <img
                                    src={getIdentityDocumentPreviewUrl(memberId, doc.id)}
                                    alt={`${doc.type}-${doc.side}`}
                                    className="h-full w-full object-contain"
                                />
                            </div>
                            <div className="space-y-1 p-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium">
                                        {doc.type} · {doc.side}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{doc.id}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {t("uploadedAt")}: {new Date(doc.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 border-t p-3">
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={`/${locale}/crm/members/${memberId}/documents/${doc.id}`}>
                                        {t("openDocument")}
                                    </Link>
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                    <a href={getIdentityDocumentPreviewUrl(memberId, doc.id)} download>
                                        {t("downloadDocument")}
                                    </a>
                                </Button>
                                <MemberDocumentEditModal
                                    memberId={memberId}
                                    isSignature={false}
                                    side={doc.side === "second" ? "second" : "first"}
                                    initialDocumentType={doc.type}
                                    currentPreviewUrl={getIdentityDocumentPreviewUrl(memberId, doc.id)}
                                />
                            </div>
                        </div>
                    ))}

                    {member.signature ? (
                        <div className="overflow-hidden rounded-md border">
                            <div className="flex h-44 items-center justify-center bg-muted/30 p-2">
                                <ThemedSignatureImage
                                    src={getSignaturePreviewUrl(memberId)}
                                    alt="signature"
                                    className="h-20 w-full object-contain"
                                />
                            </div>
                            <div className="space-y-1 p-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium">{t("signatureTitle")}</span>
                                    <span className="text-xs text-muted-foreground">{member.signature.id}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {t("uploadedAt")}: {new Date(member.signature.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 border-t p-3">
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={`/${locale}/crm/members/${memberId}/documents/signature`}>
                                        {t("openDocument")}
                                    </Link>
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                    <a href={getSignaturePreviewUrl(memberId)} download>
                                        {t("downloadDocument")}
                                    </a>
                                </Button>
                                <MemberDocumentEditModal
                                    memberId={memberId}
                                    isSignature
                                    currentPreviewUrl={getSignaturePreviewUrl(memberId)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-md border p-3 text-sm text-muted-foreground">
                            {t("noSignature")}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
