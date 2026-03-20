import { redirect } from "next/navigation";



export default async function CrmMemberDocumentsPage({
    params,
}: {
    params: Promise<{ locale: string; memberId: string }>;
}) {
    const { locale, memberId } = await params;
    return redirect(`/${locale}/crm/members/${memberId}`);
}
