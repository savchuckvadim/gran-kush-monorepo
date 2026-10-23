import type { Viewport } from "next";
import { getLocale } from "next-intl/server";

import { THEME_COLORS } from "@/modules/shared/config/app-meta";
import { BRAND } from "@/modules/shared/config/brand";
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
    // Надпись логотипа для темы Black — только у бренда, у которого она есть (shell.css)
    const lettering = BRAND.skinLettering;
    const style = lettering ? { ...fontStyle, "--brand-lettering": `url("${lettering}")` } : fontStyle;

    return (
        // Font variables sit on <html> so a skin's `--font-sans: var(--font-onest)` resolves there.
        <html
            lang={locale}
            suppressHydrationWarning
            className={fontVariables}
            style={style}
            data-brand-lettering={lettering ? "" : undefined}
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: SKIN_BOOT_SCRIPT }} />
            </head>
            <body className="font-sans antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
