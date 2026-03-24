// "use client";

// import Link from "next/link";
// import { useTranslations } from "next-intl";

// import { Button } from "@workspace/ui";

// import type { CrmMemberDetails } from "@/modules/entities/member";
// import { useMemberDetails } from "@/modules/entities/member";
// import { MemberDocumentsEditPanel } from "@/modules/widgets/member";

// export interface IMemberDocumentsPageProps {
//     memberId: string;
//     locale: string;
// }

// export function MemberDocumentsPage({ memberId, locale }: IMemberDocumentsPageProps) {
//     const t = useTranslations("crm.members");

//     const { data: member, isLoading, error } = useMemberDetails(memberId);

//     if (isLoading) {
//         return <div className="p-4 text-sm text-muted-foreground">Загрузка...</div>;
//     }

//     if (!member || error) {
//         return (
//             <div className="space-y-3 p-4 text-sm">
//                 <div className="text-muted-foreground">Член клуба не найден</div>
//                 <Button variant="outline" asChild>
//                     <Link href={`/${locale}/crm/members/${memberId}`}>{t("backToProfile")}</Link>
//                 </Button>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-6">
//             <div className="flex items-center justify-between">
//                 <div>
//                     <h1 className="text-2xl font-semibold">{t("documentsRouteTitle")}</h1>
//                     <p className="text-sm text-muted-foreground">
//                         <Link
//                             href={`/${locale}/crm/members/${memberId}`}
//                             className="font-medium text-foreground hover:underline"
//                         >
//                             {member.name} {member.surname ?? ""}
//                         </Link>{" "}
//                         · {member.email}
//                     </p>
//                 </div>
//                 <Button variant="outline" asChild>
//                     <Link href={`/${locale}/crm/members/${memberId}`}>{t("backToProfile")}</Link>
//                 </Button>
//             </div>

//             {/* <MemberDocumentsEditPanel member={member as CrmMemberDetails} locale={locale} /> */}
//         </div>
//     );
// }

