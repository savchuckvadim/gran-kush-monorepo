import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { PartnerBrief } from "@/modules/legal/partner-brief";
import { PARTNER_BRIEF, PARTNER_BRIEF_SITE } from "@/modules/legal/partner-content";
import { DEFAULT_LOCALE, isLocale } from "@/modules/shared/config/locales";
import { SITE } from "@/modules/shared/config/site";

type Props = { params: Promise<{ locale: string }> };

// Unlisted: shared by link with partners, never indexed and absent from the sitemap and the menus.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const { title, description } = PARTNER_BRIEF[isLocale(locale) ? locale : DEFAULT_LOCALE];
    return { title, description, robots: { index: false, follow: false } };
}

export default async function PartnersPage({ params }: Props) {
    if (SITE !== PARTNER_BRIEF_SITE) notFound();
    const { locale } = await params;
    const lang = isLocale(locale) ? locale : DEFAULT_LOCALE;
    setRequestLocale(lang);
    return <PartnerBrief locale={lang} />;
}
