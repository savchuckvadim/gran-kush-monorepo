import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/modules/shared/providers/providers";

import "@workspace/ui/globals.css";

const fontSans = Geist({
    subsets: ["latin"],
    variable: "--font-sans",
});

const fontMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html suppressHydrationWarning>
            <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
