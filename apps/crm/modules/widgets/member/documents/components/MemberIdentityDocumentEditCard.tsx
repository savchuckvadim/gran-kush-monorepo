// "use client";

// import Link from "next/link";
// import { useTranslations } from "next-intl";

// import { Button } from "@workspace/ui";

// import type { IdentityDocument } from "@/modules/entities/member";
// import { getIdentityDocumentPreviewUrl } from "@/modules/entities/member-documents";
// import { MemberDocumentEditModal } from "@/modules/features/members";

// export interface IMemberIdentityDocumentEditCardProps {
//     locale: string;
//     memberId: string;
//     documentId: string;
//     slot: "first" | "second";
//     doc: IdentityDocument | null;
// }

// export function MemberIdentityDocumentEditCard({ locale, memberId, documentId, slot, doc }: IMemberIdentityDocumentEditCardProps) {
//     const t = useTranslations("crm.members");

//     return (
//         <div className="overflow-hidden rounded-md border">
//             <div className="flex h-44 items-center justify-center bg-muted/30 p-2">
//                 {doc ? (
//                     <img
//                         src={getIdentityDocumentPreviewUrl(memberId, doc.id)}
//                         alt={`${doc.type}-${doc.side}`}
//                         className="h-full w-full object-contain"
//                     />
//                 ) : (
//                     <div className="text-sm text-muted-foreground">{t("noIdentityDocuments")}</div>
//                 )}
//             </div>

//             <div className="space-y-1 p-3 text-sm">
//                 <div className="flex items-center justify-between gap-3">
//                     <span className="font-medium">
//                         {doc ? `${doc.type} · ${doc.side}` : `${t("identityDocuments")} · ${slot}`}
//                     </span>
//                     <span className="text-xs text-muted-foreground">{doc?.id ?? "—"}</span>
//                 </div>

//                 {doc ? (
//                     <p className="text-xs text-muted-foreground">
//                         {t("uploadedAt")}: {new Date(doc.createdAt).toLocaleString()}
//                     </p>
//                 ) : null}
//             </div>

//             <div className="flex flex-wrap gap-2 border-t p-3">
//                 {doc ? (
//                     <>
//                         <Button size="sm" variant="outline" asChild>
//                             <Link href={`/${locale}/crm/members/${memberId}/documents/${doc.id}`}>
//                                 {t("openDocument")}
//                             </Link>
//                         </Button>
//                         <Button size="sm" variant="outline" asChild>
//                             <a href={getIdentityDocumentPreviewUrl(memberId, doc.id)} download>
//                                 {t("downloadDocument")}
//                             </a>
//                         </Button>
//                     </>
//                 ) : null}

//                 <MemberDocumentEditModal
//                     documentId={documentId}
//                     memberId={memberId}
//                     isSignature={false}
//                     payloadKey={slot === "first" ? "documentFirst" : "documentSecond"}
//                     initialDocumentType={doc?.type ?? "passport"}
//                     currentPreviewUrl={doc ? getIdentityDocumentPreviewUrl(memberId, doc.id) : ""}
//                 />
//             </div>
//         </div>
//     );
// }

