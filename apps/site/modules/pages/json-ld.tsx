import type { PlanView } from "@/modules/entities/plan/model";
import { type Locale, LOCALES } from "@/modules/shared/config/locales";
import { ROUTES } from "@/modules/shared/config/routes";
import { absoluteUrl, SITE_NAME } from "@/modules/shared/config/site";
import type { Page, Site } from "@/payload-types";

type JsonLdNode = Record<string, unknown>;

interface JsonLdInput {
    page: Page;
    site: Site | null;
    plans: PlanView[];
    locale: Locale;
}

const ORGANIZATION_ID = absoluteUrl("/#organization");

const isUrl = (value: string) => /^https?:\/\//i.test(value);

// Contacts are printed only when the editors filled them in the CMS.
const organization = (site: Site | null): JsonLdNode => {
    const contacts = site?.contacts;
    const profiles = [contacts?.telegram, contacts?.whatsapp].filter((value): value is string =>
        Boolean(value && isUrl(value))
    );
    return {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: site?.name || SITE_NAME,
        url: absoluteUrl("/"),
        logo: absoluteUrl("/apple-icon"),
        ...(contacts?.email ? { email: contacts.email } : {}),
        ...(contacts?.phone ? { telephone: contacts.phone } : {}),
        ...(profiles.length ? { sameAs: profiles } : {}),
    };
};

const website = (site: Site | null): JsonLdNode => ({
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: site?.name || SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: [...LOCALES],
    publisher: { "@id": ORGANIZATION_ID },
});

// The same plans and prices the pricing blocks show, monthly and without VAT.
const software = (site: Site | null, plans: PlanView[], locale: Locale): JsonLdNode => ({
    "@type": "SoftwareApplication",
    "@id": absoluteUrl("/#software"),
    name: site?.name || SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl(ROUTES.home(locale)),
    publisher: { "@id": ORGANIZATION_ID },
    offers: plans.flatMap((plan) =>
        plan.monthly === null
            ? []
            : [
                  {
                      "@type": "Offer",
                      name: plan.name,
                      ...(plan.forWhom ? { description: plan.forWhom } : {}),
                      price: plan.monthly,
                      priceCurrency: "EUR",
                      url: absoluteUrl(ROUTES.page(locale, "precios")),
                      priceSpecification: {
                          "@type": "UnitPriceSpecification",
                          price: plan.monthly,
                          priceCurrency: "EUR",
                          unitCode: "MON",
                          valueAddedTaxIncluded: false,
                      },
                  },
              ]
    ),
});

const faqPage = (page: Page, locale: Locale): JsonLdNode | null => {
    const items = (page.layout ?? []).flatMap((block) =>
        block.blockType === "faq" ? (block.items ?? []) : []
    );
    if (!items.length) return null;
    return {
        "@type": "FAQPage",
        url: absoluteUrl(ROUTES.page(locale, page.slug)),
        inLanguage: locale,
        mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
    };
};

export const buildJsonLd = ({ page, site, plans, locale }: JsonLdInput) => ({
    "@context": "https://schema.org",
    "@graph": [
        organization(site),
        website(site),
        plans.length ? software(site, plans, locale) : null,
        faqPage(page, locale),
    ].filter(Boolean),
});

// CMS text inside <script>: a "</script>" or "<!--" in it must not end the tag.
const serializeJsonLd = (data: unknown) =>
    JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

export const JsonLd = ({ data }: { data: unknown }) => (
    <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
);
