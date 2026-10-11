import type { Metadata } from "next";
import NextLink from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { SiteFrame } from "@site/theme";

import { getSiteDoc } from "@/modules/entities/site/api";
import { DEFAULT_LOCALE, isLocale } from "@/modules/shared/config/locales";
import { ROUTES } from "@/modules/shared/config/routes";
import { SITE_NAME } from "@/modules/shared/config/site";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
    const { locale } = await params;
    const t = await getTranslations({
        locale: isLocale(locale) ? locale : DEFAULT_LOCALE,
        namespace: "notFound",
    });
    return { title: `${t("meta")} — ${SITE_NAME}` };
};

const NotFound = async () => {
    const requested = await getLocale();
    const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
    const [t, site] = await Promise.all([getTranslations("notFound"), getSiteDoc(locale)]);
    return (
        <SiteFrame locale={locale} site={site} current="">
            <section className="sec center">
                <div className="wrap">
                    <h1 className="h2">{t("title")}</h1>
                    <p className="lede">
                        <NextLink href={ROUTES.home(locale)}>{t("back")}</NextLink>
                    </p>
                </div>
            </section>
        </SiteFrame>
    );
};

export default NotFound;
