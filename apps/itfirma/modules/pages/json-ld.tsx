import { getTranslations } from "next-intl/server";

import { type Locale, LOCALES } from "@/modules/shared/config/locales";
import { CONTACT_EMAIL, OWNER, SERVER_URL, SITE_NAME } from "@/modules/shared/config/site";

interface JsonLdProps {
    locale: Locale;
}

/** schema.org ProfessionalService for the home page: what search engines read about the studio. */
export const JsonLd = async ({ locale }: JsonLdProps) => {
    const t = await getTranslations({ locale, namespace: "meta" });
    const data = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        name: SITE_NAME,
        description: t("description"),
        url: `${SERVER_URL}/${locale}`,
        email: CONTACT_EMAIL,
        founder: { "@type": "Person", name: OWNER.name },
        areaServed: OWNER.country,
        knowsLanguage: [...LOCALES],
    };
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
};
