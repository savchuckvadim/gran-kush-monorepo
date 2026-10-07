import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { CmsPage, cmsPageMetadata } from "@/modules/pages/cms-page";
import { DEFAULT_LOCALE, isLocale } from "@/modules/shared/config/locales";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, slug } = await params;
    return cmsPageMetadata(slug, isLocale(locale) ? locale : DEFAULT_LOCALE);
}

export default async function SlugPage({ params }: Props) {
    const { locale, slug } = await params;
    const lang = isLocale(locale) ? locale : DEFAULT_LOCALE;
    setRequestLocale(lang);
    return <CmsPage slug={slug} locale={lang} />;
}
