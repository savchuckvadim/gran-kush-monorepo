import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { theme } from "@site/theme";
import type { ReactNode } from "react";

import { isLocale } from "@/modules/shared/config/locales";
import { SERVER_URL } from "@/modules/shared/config/site";

// Content comes from the CMS on every request until revalidation hooks land; the Docker build has no database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    metadataBase: new URL(SERVER_URL),
};

export default async function LocaleLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    setRequestLocale(locale);
    const messages = await getMessages();

    return (
        <html
            lang={locale}
            className={theme.htmlClassName}
            data-mode={theme.defaultMode}
            suppressHydrationWarning
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: theme.modeScript }} />
            </head>
            <body>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    {children}
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
