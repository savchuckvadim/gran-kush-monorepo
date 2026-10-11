import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import {
    PARTNER_BRIEF_DESCRIPTION,
    PARTNER_BRIEF_LOCALE,
    PARTNER_BRIEF_TITLE,
    PartnerBrief,
} from "@/modules/legal/partner-brief";
import { ROUTES } from "@/modules/shared/config/routes";

type Props = { params: Promise<{ locale: string }> };

// Unlisted: shared by link with partners, never indexed and absent from the sitemap and the menus.
export const metadata: Metadata = {
    title: PARTNER_BRIEF_TITLE,
    description: PARTNER_BRIEF_DESCRIPTION,
    robots: { index: false, follow: false },
};

export default async function PartnersPage({ params }: Props) {
    const { locale } = await params;
    // Only the Russian text exists: the language switch lands on it instead of a 404.
    if (locale !== PARTNER_BRIEF_LOCALE) redirect(`${ROUTES.home(PARTNER_BRIEF_LOCALE)}/partners`);
    setRequestLocale(locale);
    return <PartnerBrief />;
}
