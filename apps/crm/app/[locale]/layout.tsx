import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { locales } from "@/i18n";
import { PortalProvider } from "@/modules/processes";

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

    // Explicitly pass locale to getMessages for reliability
    const messages = await getMessages({ locale });

    return (
        <PortalProvider portalSlug={null}>
            <NextIntlClientProvider locale={locale} messages={messages}>
                <div className="min-h-screen">{children}</div>
            </NextIntlClientProvider>
        </PortalProvider>
    );
}
