import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InsightsList } from "@/modules/insights/insights-list";
import { isLocale, LOCALES } from "@/modules/shared/config/locales";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const t = await getTranslations({ locale, namespace: "insights" });
    return {
        title: t("pageTitle"),
        description: t("pageLead"),
        alternates: {
            canonical: `/${locale}/insights`,
            languages: Object.fromEntries(LOCALES.map((item) => [item, `/${item}/insights`])),
        },
    };
}

export default async function Page({ params }: Props) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    setRequestLocale(locale);
    return <InsightsList />;
}
