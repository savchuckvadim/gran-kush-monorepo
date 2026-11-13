import { ImageResponse } from "next/og";

import { LOCALES } from "@/modules/shared/config/locales";
import { SERVER_URL, SITE_NAME } from "@/modules/shared/config/site";

export const alt = "IT-firma — custom software, Bitrix24 and AI for business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Rendered once per language at build time: the container (256 MB) never runs the image renderer.
export const dynamic = "force-static";
export const generateStaticParams = () => LOCALES.map((locale) => ({ locale }));

/**
 * The link preview of every page of the language (Telegram, LinkedIn, WhatsApp, Slack).
 *
 * The built-in font of `next/og` has no Cyrillic, so the tagline is Latin: Spanish and Catalan in
 * their own words, every other language in English. The mark is the favicon (`app/icon.svg`)
 * scaled up, the colours are the default "black" skin of the site.
 */
const TAGLINES: Record<string, string> = {
    es: "Software a medida · Bitrix24 · IA",
    ca: "Programari a mida · Bitrix24 · IA",
};
const DEFAULT_TAGLINE = "Custom software · Bitrix24 · AI";

type Props = { params: Promise<{ locale: string }> };

export default async function OpenGraphImage({ params }: Props) {
    const { locale } = await params;
    const tagline = TAGLINES[locale] ?? DEFAULT_TAGLINE;
    const host = new URL(SERVER_URL).host;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "72px 80px",
                    background: "#0a0a0a",
                    color: "#ececec",
                }}
            >
                <svg width="120" height="120" viewBox="0 0 32 32">
                    <rect width="32" height="32" rx="8" fill="#161616" />
                    <path
                        d="M9 8H6v16h3"
                        fill="none"
                        stroke="#e9e4da"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M23 8h3v16h-3"
                        fill="none"
                        stroke="#e9e4da"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M12.5 11v10M16.5 11h5M19 11v10"
                        fill="none"
                        stroke="#ececec"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                    />
                </svg>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
                        {SITE_NAME}
                    </div>
                    <div style={{ marginTop: 28, fontSize: 46, color: "#e9e4da" }}>{tagline}</div>
                </div>
                <div style={{ fontSize: 30, color: "#8f8f8f" }}>{host}</div>
            </div>
        ),
        size
    );
}
