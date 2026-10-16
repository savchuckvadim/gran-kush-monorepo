import { redirect } from "next/navigation";

/** Раздел аккаунта пока состоит из списка клубов (паспорт и настройки — TASK-715/716). */
export default async function AccountRoot({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect(`/${locale}/me/clubs`);
}
