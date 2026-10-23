import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { locales } from "@/i18n";
import { PortalProvider } from "@/modules/processes";
import { BRAND } from "@/modules/shared/config/brand";
import { isClubHost, resolveRequestHost } from "@/modules/shared/config/club-routes";
import { pickNamespaces, PUBLIC_NAMESPACES } from "@/modules/shared/config/i18n/public-messages";
import { ApiLocaleSync } from "@/modules/shared/providers/api-locale-sync";

// Force dynamic rendering to avoid cache conflicts
export const dynamic = "force-dynamic";

/** Заголовок вкладки и описание — по хосту: кабинет на его хосте (`club.`, `app.`), иначе CRM. */
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "meta" });
    const club = isClubHost(resolveRequestHost(await headers()));
    const app = club
        ? t("cabinet", { brand: BRAND.name, cabinet: BRAND.cabinetName })
        : t("crm", { brand: BRAND.name });
    return {
        title: { default: app, template: `%s · ${app}` },
        description: club ? t("cabinetDescription") : t("crmDescription"),
        applicationName: app,
    };
}

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
