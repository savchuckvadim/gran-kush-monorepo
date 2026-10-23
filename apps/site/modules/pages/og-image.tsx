import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/modules/shared/config/locales";
import { BRAND, SERVER_URL, SITE, SITE_NAME } from "@/modules/shared/config/site";
import { LOGO_MARK_SRC } from "@/modules/sites/pafpaf/ui/logo-mark-image";

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_ALT = SITE_NAME;

const [A1, A2, A3] = BRAND.palette;
const AURORA = `linear-gradient(100deg, ${A1}, ${A2} 52%, ${A3})`;

/** `#rrggbb` → `rgba(r, g, b, alpha)` for the glows. */
const glow = (hex: string, alpha: number): string => {
    const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// The site's dark mode: black, glows in the brand's colours, the mark and the tagline. The font is the one
// bundled with next/og (Geist), it covers Cyrillic.
export const renderOgImage = async (locale: Locale) => {
    const t = await getTranslations({ locale, namespace: "meta" });
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "72px 80px",
                backgroundColor: "#000",
                backgroundImage: [
                    `radial-gradient(circle at 8% 0%, ${glow(A1, 0.55)}, transparent 46%)`,
                    `radial-gradient(circle at 96% 18%, ${glow(A2, 0.45)}, transparent 44%)`,
                    `radial-gradient(circle at 70% 110%, ${glow(A3, 0.4)}, transparent 48%)`,
                ].join(", "),
                color: "#f5f5f7",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain img */}
                <img src={LOGO_MARK_SRC} width={84} height={84} alt="" />
                <span style={{ fontSize: 48, letterSpacing: "-0.03em" }}>{BRAND.wordmark}</span>
            </div>
            <div
                style={{
                    display: "flex",
                    maxWidth: 980,
                    fontSize: 76,
                    lineHeight: 1.04,
                    letterSpacing: "-0.045em",
                }}
            >
                {t(`tagline.${SITE}`)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div
                    style={{ width: 160, height: 10, borderRadius: 999, backgroundImage: AURORA }}
                />
                <span style={{ fontSize: 28, color: "rgba(245, 245, 247, 0.58)" }}>
                    {new URL(SERVER_URL).host}
                </span>
            </div>
        </div>,
        OG_SIZE
    );
};
