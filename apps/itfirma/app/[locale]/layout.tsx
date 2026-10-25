import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";

import type { ReactNode } from "react";

import { Footer } from "@/modules/home/footer";
import { Header } from "@/modules/home/header";
import { isLocale, LOCALES, OG_LOCALES } from "@/modules/shared/config/locales";
import { SERVER_URL, SITE_NAME } from "@/modules/shared/config/site";
import { SKIN_SCRIPT } from "@/modules/shared/config/skins";
import { Backdrop } from "@/modules/shared/ui/backdrop";
import { SkinSync } from "@/modules/shared/ui/skin-sync";

import { FONT_CLASS_NAME } from "../fonts";

import "../globals.css";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export const generateStaticParams = () => LOCALES.map((locale) => ({ locale }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const t = await getTranslations({ locale, namespace: "meta" });
    return {
        metadataBase: new URL(SERVER_URL),
        title: { default: `${SITE_NAME} · ${t("title")}`, template: `%s · ${SITE_NAME}` },
        description: t("description"),
        alternates: {
            canonical: `/${locale}`,
            languages: Object.fromEntries(LOCALES.map((item) => [item, `/${item}`])),
        },
        openGraph: {
            type: "website",
            siteName: SITE_NAME,
            locale: OG_LOCALES[locale],
            title: `${SITE_NAME} · ${t("title")}`,
            description: t("description"),
        },
    };
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    setRequestLocale(locale);
    const messages = await getMessages();

    return (
        <html lang={locale} className={FONT_CLASS_NAME} data-skin="black" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: SKIN_SCRIPT }} />
            </head>
            <body className="flex min-h-dvh flex-col">
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <SkinSync />
                    <Backdrop />
                    <Header />
                    <main className="flex-1">{children}</main>
                    <Footer />
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
