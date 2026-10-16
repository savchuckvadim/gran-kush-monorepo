import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { locales } from "@/i18n";
import { PortalProvider } from "@/modules/processes";
import { pickNamespaces, PUBLIC_NAMESPACES } from "@/modules/shared/config/i18n/public-messages";
import { ApiLocaleSync } from "@/modules/shared/providers/api-locale-sync";

// Force dynamic rendering to avoid cache conflicts
export const dynamic = "force-dynamic";

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    if (!locale || !locales.includes(locale as (typeof locales)[number])) {
        notFound();
    }

    // Pages without a session get only their own translations; the closed sections add the full
    // dictionary with AppMessagesProvider
    const messages = pickNamespaces(await getMessages({ locale }), PUBLIC_NAMESPACES);

    return (
        <PortalProvider portalSlug={null}>
            <NextIntlClientProvider locale={locale} messages={messages}>
                <ApiLocaleSync />
                <div className="min-h-screen">{children}</div>
            </NextIntlClientProvider>
        </PortalProvider>
    );
}
