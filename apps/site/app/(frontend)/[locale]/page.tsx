import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { CmsPage, cmsPageMetadata } from "@/modules/pages/cms-page";
import { DEFAULT_LOCALE, isLocale } from "@/modules/shared/config/locales";
import { HOME_SLUG } from "@/modules/shared/config/routes";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    return cmsPageMetadata(HOME_SLUG, isLocale(locale) ? locale : DEFAULT_LOCALE);
}

export default async function HomePage({ params }: Props) {
    const { locale } = await params;
    const lang = isLocale(locale) ? locale : DEFAULT_LOCALE;
    setRequestLocale(lang);
    return <CmsPage slug={HOME_SLUG} locale={lang} />;
}
