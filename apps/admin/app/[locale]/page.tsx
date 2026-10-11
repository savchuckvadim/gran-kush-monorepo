import { redirect } from "next/navigation";

import { ROUTES } from "@/modules/shared/config/routes";

// Без сессии раздел «Клубы» сам отправит на вход
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect(`/${locale}${ROUTES.CLUBS}`);
}
