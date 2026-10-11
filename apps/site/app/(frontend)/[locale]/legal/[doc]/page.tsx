import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { LEGAL_CONTENT, LegalPage } from "@/modules/legal/legal-page";
import { LEGAL_INDEXABLE } from "@/modules/legal/provider";
import { isLegalDoc } from "@/modules/legal/types";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/modules/shared/config/locales";
import { ROUTES } from "@/modules/shared/config/routes";
import { SITE_NAME } from "@/modules/shared/config/site";

type Props = { params: Promise<{ locale: string; doc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, doc } = await params;
    if (!isLegalDoc(doc)) return {};
    const lang = isLocale(locale) ? locale : DEFAULT_LOCALE;
    const { title, description } = LEGAL_CONTENT[lang].docs[doc];
    const languages = Object.fromEntries(LOCALES.map((code) => [code, ROUTES.legal(code, doc)]));
    return {
        title: `${title} — ${SITE_NAME}`,
        description,
        robots: LEGAL_INDEXABLE ? undefined : { index: false, follow: true },
        alternates: {
            canonical: ROUTES.legal(lang, doc),
            languages: { ...languages, "x-default": ROUTES.legal(DEFAULT_LOCALE, doc) },
        },
    };
}

export default async function LegalDocPage({ params }: Props) {
    const { locale, doc } = await params;
    if (!isLegalDoc(doc)) notFound();
    const lang = isLocale(locale) ? locale : DEFAULT_LOCALE;
    setRequestLocale(lang);
    return <LegalPage doc={doc} locale={lang} />;
}
