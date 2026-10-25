import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getServiceContent } from "@/modules/content/services";
import { ServicePage } from "@/modules/services/service-page";
import { isLocale, LOCALES } from "@/modules/shared/config/locales";
import { SERVICE_SLUGS, serviceKeyBySlug } from "@/modules/shared/config/services";
import { absoluteUrl, SITE_NAME } from "@/modules/shared/config/site";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const generateStaticParams = () =>
    LOCALES.flatMap((locale) => Object.values(SERVICE_SLUGS).map((slug) => ({ locale, slug })));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, slug } = await params;
    const key = serviceKeyBySlug(slug);
    if (!isLocale(locale) || !key) return {};
    const content = getServiceContent(locale, key);
    return {
        title: content.metaTitle,
        description: content.metaDescription,
        alternates: {
            canonical: `/${locale}/services/${slug}`,
            languages: Object.fromEntries(
                LOCALES.map((item) => [item, `/${item}/services/${slug}`])
            ),
        },
        openGraph: {
            title: `${content.metaTitle} · ${SITE_NAME}`,
            description: content.metaDescription,
            url: absoluteUrl(`/${locale}/services/${slug}`),
        },
    };
}

export default async function Page({ params }: Props) {
    const { locale, slug } = await params;
    const key = serviceKeyBySlug(slug);
    if (!isLocale(locale) || !key) notFound();
    setRequestLocale(locale);
    const content = getServiceContent(locale, key);
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Service",
        name: content.title,
        description: content.metaDescription,
        provider: { "@type": "ProfessionalService", name: SITE_NAME },
        areaServed: "ES",
        url: absoluteUrl(`/${locale}/services/${slug}`),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ServicePage content={content} />
        </>
    );
}
