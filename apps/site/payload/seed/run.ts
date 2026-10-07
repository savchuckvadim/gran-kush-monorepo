import { getPayload } from "payload";

import { DEFAULT_LOCALE, LOCALES } from "../../modules/shared/config/locales";
import config from "../../payload.config";

import { PAGES, PLANS, SITE_DOC } from "./content";

// Idempotent: run it again after editing content.ts and the documents are updated in place.
// The default locale goes first so required fields exist before the translations.
const ORDER = [DEFAULT_LOCALE, ...LOCALES.filter((locale) => locale !== DEFAULT_LOCALE)];

const payload = await getPayload({ config });

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
            layout: page.layout(locale),
        };
        if (id === undefined) {
            id = (await payload.create({ collection: "pages", data, locale })).id;
        } else {
            await payload.update({ collection: "pages", id, data, locale });
        }
    }
}

payload.logger.info(`Seed done: site ${SITE_DOC.code}, ${PLANS.length} plans, ${PAGES.length} pages × ${ORDER.length} locales`);
process.exit(0);
