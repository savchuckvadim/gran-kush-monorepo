import type { Locale } from "../../modules/shared/config/locales";
import type { SiteCode } from "../../modules/shared/config/site";
import type { Page, Plan } from "../../payload-types";

/** One text in every locale. */
export type L = Record<Locale, string>;

export type Block = NonNullable<Page["layout"]>[number];

export type FeatureIcon = NonNullable<
    Extract<Block, { blockType: "featureGrid" }>["items"]
>[number]["icon"];

export const pick = (text: L, locale: Locale) => text[locale];

export type PlanSeed = Omit<Plan, "id" | "createdAt" | "updatedAt" | "forWhom" | "features"> & {
    forWhom: L;
    features: { id: string; text: L }[];
};

export interface PageSeed {
    slug: string;
    title: L;
    seoTitle: L;
    seoDescription: L;
    layout: (locale: Locale) => Block[];
}

/** Starter content of one installation's site: its database holds only this. */
export interface SiteContent {
    PAGES: PageSeed[];
    PLANS: PlanSeed[];
    SITE_DOC: { code: SiteCode; name: string; domain: string; footerNote: L; legalNote: L };
}
