import type { Payload } from "payload";

import { DEFAULT_LOCALE, LOCALES } from "../../modules/shared/config/locales";
import { SITE } from "../../modules/shared/config/site";

import { SITE_CONTENT } from "./site-content";

// Idempotent: run it again after editing the content and the documents are updated in place.
// Seeds the site of this build (NEXT_PUBLIC_SITE): each installation has its own database.
// The default locale goes first so required fields exist before the translations.
const ORDER = [DEFAULT_LOCALE, ...LOCALES.filter((locale) => locale !== DEFAULT_LOCALE)];

// Each block type is one table for all pages, so the readable ids from content.ts get a page prefix:
// unique across pages and sites, and still the same in every locale.
const scopeIds = <T>(value: T, prefix: string): T => {
    if (Array.isArray(value)) return value.map((item: unknown) => scopeIds(item, prefix)) as T;
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
                key,
                key === "id" && typeof item === "string" ? `${prefix}-${item}` : scopeIds(item, prefix),
            ]),
        ) as T;
    }
    return value;
};

export async function seedContent(payload: Payload): Promise<void> {
    const content = SITE_CONTENT[SITE];
    if (!content) {
        payload.logger.info(`Seed skipped: no starter content for site ${SITE}`);
        return;
    }
    const { PAGES, PLANS, SITE_DOC } = content;
    const siteFound = await payload.find({
        collection: "sites",
        where: { code: { equals: SITE_DOC.code } },
        limit: 1,
    });
    let siteId = siteFound.docs[0]?.id;
    for (const locale of ORDER) {
        const data = {
            code: SITE_DOC.code,
            name: SITE_DOC.name,
            domain: SITE_DOC.domain,
            footerNote: SITE_DOC.footerNote[locale],
            legalNote: SITE_DOC.legalNote[locale],
        };
        if (siteId === undefined) {
            siteId = (await payload.create({ collection: "sites", data, locale })).id;
        } else {
            await payload.update({ collection: "sites", id: siteId, data, locale });
        }
    }

    for (const plan of PLANS) {
        const found = await payload.find({ collection: "plans", where: { code: { equals: plan.code } }, limit: 1 });
        let id = found.docs[0]?.id;
        for (const locale of ORDER) {
            const data = {
                ...plan,
                forWhom: plan.forWhom[locale],
                features: plan.features.map((feature) => ({ id: feature.id, text: feature.text[locale] })),
            };
            if (id === undefined) {
                id = (await payload.create({ collection: "plans", data, locale })).id;
            } else {
                await payload.update({ collection: "plans", id, data, locale });
            }
        }
    }

    for (const page of PAGES) {
        const found = await payload.find({
            collection: "pages",
            where: { and: [{ site: { equals: SITE_DOC.code } }, { slug: { equals: page.slug } }] },
            limit: 1,
        });
        let id = found.docs[0]?.id;
        for (const locale of ORDER) {
            const data = {
                title: page.title[locale],
                site: SITE_DOC.code,
                slug: page.slug,
                seo: { title: page.seoTitle[locale], description: page.seoDescription[locale] },
                layout: scopeIds(page.layout(locale), `${SITE_DOC.code}-${page.slug}`),
            };
            if (id === undefined) {
                id = (await payload.create({ collection: "pages", data, locale })).id;
            } else {
                await payload.update({ collection: "pages", id, data, locale });
            }
        }
    }

    payload.logger.info(
        `Seed done: site ${SITE_DOC.code}, ${PLANS.length} plans, ${PAGES.length} pages × ${ORDER.length} locales`,
    );
}
