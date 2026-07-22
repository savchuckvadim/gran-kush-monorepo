import { redirect } from "next/navigation";

/** Индекс без кода сущности — ведём в конструктор, где перечислены все сущности. */
export default async function CrmEntitiesIndexPage({
    params,
}: {
    params: Promise<{ locale: string; portal: string }>;
}) {
    const { locale, portal } = await params;
    return redirect(`/${locale}/${portal}/crm/settings/entities`);
}
