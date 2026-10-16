import type { Viewport } from "next";
import { getLocale } from "next-intl/server";

import { THEME_COLORS } from "@/modules/shared/config/app-meta";
import { SKIN_BOOT_SCRIPT } from "@/modules/shared/lib/skin/skin-scripts";
import { Providers } from "@/modules/shared/providers/providers";

import { fontStyle, fontVariables } from "./fonts";

import "@workspace/ui/globals.css";

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
        { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
    ],
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // язык страницы для скринридеров и переноса слов; next-intl знает его из адреса
    const locale = await getLocale();

    return (
        // Font variables sit on <html> so a skin's `--font-sans: var(--font-onest)` resolves there.
        <html lang={locale} suppressHydrationWarning className={fontVariables} style={fontStyle}>
            <head>
                <script dangerouslySetInnerHTML={{ __html: SKIN_BOOT_SCRIPT }} />
            </head>
            <body className="font-sans antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
