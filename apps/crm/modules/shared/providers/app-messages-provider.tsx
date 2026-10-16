import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import type { ReactNode } from "react";

/**
 * Полный словарь для разделов под входом (CRM, кабинет участника, листы печати). Корневой layout
 * отдаёт в клиент только публичные переводы (`PUBLIC_NAMESPACES`), закрытый раздел оборачивается
 * этим провайдером.
 */
export async function AppMessagesProvider({ children }: { children: ReactNode }) {
    const locale = await getLocale();
    const messages = await getMessages({ locale });
    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
        </NextIntlClientProvider>
    );
}
