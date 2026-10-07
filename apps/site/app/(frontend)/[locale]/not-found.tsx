import NextLink from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { DEFAULT_LOCALE, isLocale } from "@/modules/shared/config/locales";
import { ROUTES } from "@/modules/shared/config/routes";

export default async function NotFound() {
    const t = await getTranslations("notFound");
    const locale = await getLocale();
    return (
        <main className="sec center">
            <div className="wrap">
                <h1 className="h2">{t("title")}</h1>
                <p className="lede" style={{ marginLeft: "auto", marginRight: "auto" }}>
                    <NextLink href={ROUTES.home(isLocale(locale) ? locale : DEFAULT_LOCALE)}>
                        {t("back")}
                    </NextLink>
                </p>
            </div>
        </main>
    );
}
