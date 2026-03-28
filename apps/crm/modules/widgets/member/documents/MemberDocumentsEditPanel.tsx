// "use client";

// import { useTranslations } from "next-intl";

// import type { CrmMemberDetails } from "@/modules/entities/member";

// import { MemberIdentityDocumentEditCard, MemberSignatureEditCard } from "./components";

// type MemberSlot = "first" | "second";

// export interface IMemberDocumentsEditPanelProps {
//     member: CrmMemberDetails;
//     locale: string;
// }

// export function MemberDocumentsEditPanel({ member, locale }: IMemberDocumentsEditPanelProps) {
//     const t = useTranslations("crm.members");

//     const firstSideDocument = member.identityDocuments.find((doc) => doc.side === "first") ?? null;
//     const secondSideDocument = member.identityDocuments.find((doc) => doc.side === "second") ?? null;

//     return (
//         <section className="rounded-lg border bg-background p-4">
//             <h2 className="mb-3 text-base font-medium">{t("documents")}</h2>

//             <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
//                 {(
//                     [
//                         { slot: "first" as const, doc: firstSideDocument },
//                         { slot: "second" as const, doc: secondSideDocument },
//                     ] as Array<{ slot: MemberSlot; doc: typeof firstSideDocument }>
//                 ).map(({ slot, doc }) => (
//                     <MemberIdentityDocumentEditCard
//                         key={slot}
//                         locale={locale}
//                         memberId={member.id}
//                         slot={slot}
//                         doc={doc}
//                     />
//                 ))}

//                 <MemberSignatureEditCard locale={locale} memberId={member.id} signature={member.signature} />
//             </div>
//         </section>
//     );
// }
