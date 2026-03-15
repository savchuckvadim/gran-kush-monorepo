import { redirect } from "next/navigation";

export default async function CrmHomePage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    redirect(`/${locale}/crm/members`);
}
