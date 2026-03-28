import { redirect } from "next/navigation";

export default async function CrmHomePage({
    params,
}: {
    params: Promise<{ locale: string; portal: string }>;
}) {
    const { locale, portal } = await params;
    redirect(`/${locale}/${portal}/crm/member/list`);
}
