import { SKIN_BOOT_SCRIPT } from "@/modules/shared/lib/skin/skin-scripts";
import { Providers } from "@/modules/shared/providers/providers";

import { fontStyle, fontVariables } from "./fonts";

import "@workspace/ui/globals.css";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // Font variables sit on <html> so a skin's `--font-sans: var(--font-onest)` resolves there.
        <html suppressHydrationWarning className={fontVariables} style={fontStyle}>
            <head>
                <script dangerouslySetInnerHTML={{ __html: SKIN_BOOT_SCRIPT }} />
            </head>
            <body className="font-sans antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
