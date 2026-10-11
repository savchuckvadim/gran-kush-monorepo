import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RenderBlocks, SiteFrame } from "@site/theme";

import { getPage } from "@/modules/entities/page/api";
import { getPlans } from "@/modules/entities/plan/api";
import { getSiteDoc } from "@/modules/entities/site/api";
import { DEFAULT_LOCALE, type Locale, LOCALES, OG_LOCALES } from "@/modules/shared/config/locales";
import { HOME_SLUG, ROUTES } from "@/modules/shared/config/routes";
import { SITE_NAME } from "@/modules/shared/config/site";

import { buildJsonLd, JsonLd } from "./json-ld";

const PRICING_BLOCKS = new Set(["pricingTeaser", "pricingTable"]);

export const CmsPage = async ({ slug, locale }: { slug: string; locale: Locale }) => {
    const [page, site] = await Promise.all([getPage(slug, locale), getSiteDoc(locale)]);
    if (!page) notFound();
    const blocks = page.layout ?? [];
    const plans = blocks.some((block) => PRICING_BLOCKS.has(block.blockType))
        ? await getPlans(locale)
        : [];
    const current = slug === HOME_SLUG ? "home" : slug === "precios" ? "pricing" : slug;

    return (
        <SiteFrame locale={locale} site={site} current={current}>
            <JsonLd data={buildJsonLd({ page, site, plans, locale })} />
            <RenderBlocks blocks={blocks} locale={locale} plans={plans} />
        </SiteFrame>
    );
};

// The share image comes from the opengraph-image files next to the routes.
export const cmsPageMetadata = async (slug: string, locale: Locale): Promise<Metadata> => {
    const page = await getPage(slug, locale);
    if (!page) return {};
    const title = page.seo?.title || page.title;
    const description = page.seo?.description ?? undefined;
    const url = ROUTES.page(locale, slug);
    const languages = Object.fromEntries(LOCALES.map((code) => [code, ROUTES.page(code, slug)]));
    return {
        title,
        description,
        alternates: {
            canonical: url,
            languages: { ...languages, "x-default": ROUTES.page(DEFAULT_LOCALE, slug) },
        },
        openGraph: {
            type: "website",
            url,
            siteName: SITE_NAME,
            title,
            description,
            locale: OG_LOCALES[locale],
            alternateLocale: LOCALES.filter((code) => code !== locale).map(
                (code) => OG_LOCALES[code]
            ),
        },
        twitter: { card: "summary_large_image", title, description },
    };
};
