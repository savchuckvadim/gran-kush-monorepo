import { redirect } from "next/navigation";

/** Отдельный URL документов — перенаправляем на профиль, где блок документов уже есть. */
export default async function CrmMemberDocumentsPage({
    params,
}: {
    params: Promise<{ locale: string; portal: string; id: string }>;
}) {
    const { locale, portal, id } = await params;
    return redirect(`/${locale}/${portal}/crm/member/details/${id}`);
}
