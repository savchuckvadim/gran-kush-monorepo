import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RenderBlocks, SiteFrame } from "@site/theme";

import { getPage } from "@/modules/entities/page/api";
import { getPlans } from "@/modules/entities/plan/api";
import { getSiteDoc } from "@/modules/entities/site/api";
import { type Locale, LOCALES } from "@/modules/shared/config/locales";
import { HOME_SLUG, ROUTES } from "@/modules/shared/config/routes";

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
            <RenderBlocks blocks={blocks} locale={locale} plans={plans} />
        </SiteFrame>
    );
};

export const cmsPageMetadata = async (slug: string, locale: Locale): Promise<Metadata> => {
    const page = await getPage(slug, locale);
    if (!page) return {};
    const languages = Object.fromEntries(LOCALES.map((code) => [code, ROUTES.page(code, slug)]));
    return {
        title: page.seo?.title || page.title,
        description: page.seo?.description ?? undefined,
        alternates: {
            canonical: ROUTES.page(locale, slug),
            languages: { ...languages, "x-default": ROUTES.page("es", slug) },
        },
        openGraph: {
            title: page.seo?.title || page.title,
            description: page.seo?.description ?? undefined,
            locale,
        },
    };
};
