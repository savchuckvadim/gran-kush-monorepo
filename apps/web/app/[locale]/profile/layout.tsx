import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { locales } from "@/i18n";
import { ProfileSidebar } from "@/modules/processes";
import { SidebarProvider } from "@/modules/shared/ui/Sidebar/sidebar-context";
import { Header } from "@/modules/widgets/header/header";

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
        <NextIntlClientProvider locale={locale} messages={messages}>
            <SidebarProvider>
                <div className="flex min-h-screen min-w-full flex-row">
                    <ProfileSidebar />
                    <div className="flex flex-col flex-1">
                        <Header />
                        <main className="mx-auto container p-3 flex flex-col justify-center">
                            {children}
                        </main>
                    </div>
                </div>
            </SidebarProvider>
        </NextIntlClientProvider>
    );
}
