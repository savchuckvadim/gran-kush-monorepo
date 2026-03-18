import { getTranslations } from "next-intl/server";

import { MemberPage } from "@/modules/pages";

export default async function Page({
    params,
}: {
    params: Promise<{ locale: string; memberId: string }>;
}) {
    const { locale, memberId } = await params;
    const t = await getTranslations("crm.members");
    const signatureTitle = t("signatureTitle")
    const documentsTitle = t("documents")
    const openDocumentsRoute = t("openDocumentsRoute")

    return (<MemberPage
        memberId={memberId}
        locale={locale}
        signatureTitle={signatureTitle}
        documentsTitle={documentsTitle}
        openDocumentsRoute={openDocumentsRoute}
    />
        // <div className="space-y-6">
        //     <div className="flex items-center justify-between">
        //         <div>
        //             <h1 className="text-2xl font-semibold">
        //                 {member.name} {member.surname ?? ""}
        //             </h1>
        //             <div className="mt-2 flex flex-wrap gap-2">
        //                 {member.mjStatuses.map((status) => (
        //                     <span
        //                         key={status.id}
        //                         className="rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground"
        //                     >
        //                         {status.name}
        //                     </span>
        //                 ))}
        //                 <span
        //                     className={`rounded-md px-2 py-1 text-xs ${
        //                         member.emailConfirmed
        //                             ? "border border-green-500/30 bg-green-500/10 text-green-700"
        //                             : "border border-amber-500/30 bg-amber-500/10 text-amber-700"
        //                     }`}
        //                 >
        //                     {member.emailConfirmed ? t("emailConfirmed") : t("emailNotConfirmed")}
        //                 </span>
        //             </div>
        //             <p className="text-sm text-muted-foreground">
        //                 {member.email} · {t("statusLabel")}: {member.status}
        //             </p>
        //         </div>

        //         <Button variant="outline" asChild>
        //             <Link href={`/${locale}/crm/members`}>{t("backToClients")}</Link>
        //         </Button>
        //     </div>

        //     <div className="grid gap-4 lg:grid-cols-3">
        //         <section className="rounded-lg border bg-background p-4">
        //             <div className="mb-3 flex items-center justify-between gap-2">
        //                 <h2 className="text-base font-medium">{t("profileTitle")}</h2>
        //                 <MemberProfileEditModal member={member} />
        //             </div>
        //             <dl className="space-y-2 text-sm">
        //                 <div className="flex justify-between gap-4">
        //                     <dt className="text-muted-foreground">{t("memberId")}</dt>
        //                     <dd className="text-right font-mono text-xs">{member.id}</dd>
        //                 </div>
        //                 <div className="flex justify-between gap-4">
        //                     <dt className="text-muted-foreground">{t("userId")}</dt>
        //                     <dd className="text-right font-mono text-xs">{member.userId}</dd>
        //                 </div>
        //                 <div className="flex justify-between gap-4">
        //                     <dt className="text-muted-foreground">{t("phone")}</dt>
        //                     <dd>{member.phone ?? "—"}</dd>
        //                 </div>
        //                 <div className="flex justify-between gap-4">
        //                     <dt className="text-muted-foreground">{t("birthday")}</dt>
        //                     <dd>{member.birthday ? new Date(member.birthday).toLocaleDateString() : "—"}</dd>
        //                 </div>
        //                 <div className="flex justify-between gap-4">
        //                     <dt className="text-muted-foreground">{t("address")}</dt>
        //                     <dd className="text-right">{member.address ?? "—"}</dd>
        //                 </div>
        //                 <div className="flex justify-between gap-4">
        //                     <dt className="text-muted-foreground">{t("membershipNumber")}</dt>
        //                     <dd>{member.membershipNumber ?? "—"}</dd>
        //                 </div>
        //                 <div className="flex justify-between gap-4">
        //                     <dt className="text-muted-foreground">{t("createdAt")}</dt>
        //                     <dd>{new Date(member.createdAt).toLocaleString()}</dd>
        //                 </div>
        //                 <div className="flex justify-between gap-4">
        //                     <dt className="text-muted-foreground">{t("updatedAt")}</dt>
        //                     <dd>{new Date(member.updatedAt).toLocaleString()}</dd>
        //                 </div>
        //             </dl>
        //         </section>

        //         <section className="rounded-lg border bg-background p-4">
        //             <h2 className="mb-3 text-base font-medium">{t("notesTitle")}</h2>
        //             <p className="text-sm text-muted-foreground">{member.notes ?? t("noNotes")}</p>
        //         </section>
        //     </div>

        //     <section className="rounded-lg border bg-background p-4">
        //         <div className="mb-3 flex items-center justify-between gap-2">
        //             <h2 className="text-base font-medium">{t("documents")}</h2>
        //             <Button variant="outline" size="sm" asChild>
        //                 <Link href={`/${locale}/crm/members/${member.id}/documents`}>
        //                     <span className="inline-flex items-center gap-2">
        //                         <Pencil className="h-4 w-4" />
        //                         {t("openDocumentsRoute")}
        //                     </span>
        //                 </Link>
        //             </Button>
        //         </div>
        //         {member.identityDocuments.length > 0 && (
        //             <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        //                 {member.identityDocuments.map((doc) => (
        //                     <Link
        //                         key={doc.id}
        //                         href={`/${locale}/crm/members/${member.id}/documents/${doc.id}`}
        //                         className="group overflow-hidden rounded-md border bg-muted/30"
        //                     >
        //                         <div className="flex h-40 w-full items-center justify-center bg-muted/30 p-2">
        //                             <img
        //                                 src={getIdentityDocumentPreviewUrl(member.id, doc.id)}
        //                                 alt={`${doc.type}-${doc.side}`}
        //                                 className="h-full w-full object-contain"
        //                             />
        //                         </div>
        //                         <div className="border-t px-2 py-1 text-xs text-muted-foreground">
        //                             {doc.type} · {doc.side}
        //                         </div>
        //                     </Link>
        //                 ))}
        //                 {member.signature && (
        //                     <Link
        //                         href={`/${locale}/crm/members/${member.id}/documents/signature`}
        //                         className="group overflow-hidden rounded-md border bg-muted/30"
        //                     >
        //                         <div className="flex h-40 w-full items-center justify-center bg-muted/30 p-2">
        //                             <ThemedSignatureImage
        //                                 src={getSignaturePreviewUrl(member.id)}
        //                                 alt="signature"
        //                                 className="h-full w-full object-contain"
        //                             />
        //                         </div>
        //                         <div className="border-t px-2 py-1 text-xs text-muted-foreground">
        //                             {t("signatureTitle")}
        //                         </div>
        //                     </Link>
        //                 )}
        //             </div>
        //         )}
        //         {/* <div className="space-y-2 text-sm">
        //             {member.documents.length > 0 ? (
        //                 member.documents.map((doc) => (
        //                     <div
        //                         key={doc.id}
        //                         className="flex items-center justify-between rounded-md border p-2"
        //                     >
        //                         <span className="text-muted-foreground">
        //                             {doc.name} ({doc.type})
        //                         </span>
        //                         <span>{doc.number ?? "—"}</span>
        //                     </div>
        //                 ))
        //             ) : (
        //                 <p className="text-muted-foreground">{t("noDocumentMetadata")}</p>
        //             )}
        //         </div> */}
        //     </section>
        // </div>
    );
}
