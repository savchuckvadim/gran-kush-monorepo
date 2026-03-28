// "use client";

// import Link from "next/link";
// import { useTranslations } from "next-intl";

// import { Button } from "@workspace/ui";

// import type { IMemberSignature } from "@/modules/entities/member";
// import { ThemedSignatureImage } from "@/modules/entities/member";
// import { getSignaturePreviewUrl } from "@/modules/entities/member-documents";
// import { MemberDocumentEditModal } from "@/modules/features/members";

// export interface IMemberSignatureEditCardProps {
//     locale: string;
//     memberId: string;
//     signature: IMemberSignature | null;
// }

// export function MemberSignatureEditCard({ locale, memberId, signature }: IMemberSignatureEditCardProps) {
//     const t = useTranslations("crm.members");

//     const signatureTitle = t("signatureTitle");

//     if (!signature) {
//         return (
//             <div className="overflow-hidden rounded-md border md:col-span-3">
//                 <div className="flex h-44 items-center justify-center bg-muted/30 p-2 text-sm text-muted-foreground">
//                     {t("noSignature")}
//                 </div>
//                 <div className="space-y-1 p-3 text-sm">
//                     <div className="flex items-center justify-between gap-3">
//                         <span className="font-medium">{signatureTitle}</span>
//                         <span className="text-xs text-muted-foreground">—</span>
//                     </div>
//                 </div>
//                 <div className="flex flex-wrap gap-2 border-t p-3">
//                     <MemberDocumentEditModal memberId={memberId} documentId={'signature'} isSignature currentPreviewUrl="" />
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="overflow-hidden rounded-md border md:col-span-3">
//             <div className="flex h-44 items-center justify-center bg-muted/30 p-2">
//                 <ThemedSignatureImage
//                     src={getSignaturePreviewUrl(memberId)}
//                     alt="signature"
//                     className="h-20 w-full object-contain"
//                 />
//             </div>

//             <div className="space-y-1 p-3 text-sm">
//                 <div className="flex items-center justify-between gap-3">
//                     <span className="font-medium">{signatureTitle}</span>
//                     <span className="text-xs text-muted-foreground">{signature.id}</span>
//                 </div>
//                 <p className="text-xs text-muted-foreground">
//                     {t("uploadedAt")}: {new Date(signature.createdAt).toLocaleString()}
//                 </p>
//             </div>

//             <div className="flex flex-wrap gap-2 border-t p-3">
//                 <Button size="sm" variant="outline" asChild>
//                     <Link href={`/${locale}/crm/members/${memberId}/documents/signature`}>{t("openDocument")}</Link>
//                 </Button>
//                 <Button size="sm" variant="outline" asChild>
//                     <a href={getSignaturePreviewUrl(memberId)} download>
//                         {t("downloadDocument")}
//                     </a>
//                 </Button>
//                 <MemberDocumentEditModal memberId={memberId} documentId={'signature'} isSignature currentPreviewUrl={getSignaturePreviewUrl(memberId)} />
//             </div>
//         </div>
//     );
// }
