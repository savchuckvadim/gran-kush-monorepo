import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Button } from "@workspace/ui";

import { getCrmMemberById,ThemedSignatureImage } from "@/modules/entities/member";
import {
    getIdentityDocumentPreviewUrl,
    getSignaturePreviewUrl,
} from "@/modules/entities/member-documents";
import { MemberDocumentEditModal } from "@/modules/features/members";

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

    const firstSideDocument = member.identityDocuments.find((doc) => doc.side === "first") ?? null;
    const secondSideDocument = member.identityDocuments.find((doc) => doc.side === "second") ?? null;

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
                    {[
                        { slot: "first" as const, doc: firstSideDocument },
                        { slot: "second" as const, doc: secondSideDocument },
                    ].map(({ slot, doc }) => (
                        <div key={slot} className="overflow-hidden rounded-md border">
                            <div className="flex h-44 items-center justify-center bg-muted/30 p-2">
                                {doc ? (
                                    <img
                                        src={getIdentityDocumentPreviewUrl(memberId, doc.id)}
                                        alt={`${doc.type}-${doc.side}`}
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <div className="text-sm text-muted-foreground">{t("noIdentityDocuments")}</div>
                                )}
                            </div>
                            <div className="space-y-1 p-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium">
                                        {doc ? `${doc.type} · ${doc.side}` : `${t("identityDocuments")} · ${slot}`}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{doc?.id ?? "—"}</span>
                                </div>
                                {doc ? (
                                    <p className="text-xs text-muted-foreground">
                                        {t("uploadedAt")}: {new Date(doc.createdAt).toLocaleString()}
                                    </p>
                                ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2 border-t p-3">
                                {doc ? (
                                    <>
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
                                    </>
                                ) : null}
                                <MemberDocumentEditModal
                                    memberId={memberId}
                                    isSignature={false}
                                    side={slot}
                                    initialDocumentType={doc?.type ?? "passport"}
                                    currentPreviewUrl={doc ? getIdentityDocumentPreviewUrl(memberId, doc.id) : ""}
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
                        <div className="overflow-hidden rounded-md border">
                            <div className="flex h-44 items-center justify-center bg-muted/30 p-2 text-sm text-muted-foreground">
                                {t("noSignature")}
                            </div>
                            <div className="space-y-1 p-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium">{t("signatureTitle")}</span>
                                    <span className="text-xs text-muted-foreground">—</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 border-t p-3">
                                <MemberDocumentEditModal
                                    memberId={memberId}
                                    isSignature
                                    currentPreviewUrl=""
                                />
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
