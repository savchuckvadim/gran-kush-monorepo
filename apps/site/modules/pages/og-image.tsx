import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/modules/shared/config/locales";
import { SERVER_URL, SITE_NAME } from "@/modules/shared/config/site";
import { LOGO_MARK_SRC } from "@/modules/sites/pafpaf/ui/logo-mark-image";

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_ALT = SITE_NAME;

const AURORA = "linear-gradient(100deg, #8f7bff, #ff6fae 52%, #ffbf5a)";

// The site's dark mode: black, aurora glows, the mark and the tagline. The font is the one
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
                    "radial-gradient(circle at 8% 0%, rgba(143, 123, 255, 0.55), transparent 46%)",
                    "radial-gradient(circle at 96% 18%, rgba(255, 111, 174, 0.45), transparent 44%)",
                    "radial-gradient(circle at 70% 110%, rgba(255, 191, 90, 0.4), transparent 48%)",
                ].join(", "),
                color: "#f5f5f7",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain img */}
                <img src={LOGO_MARK_SRC} width={84} height={84} alt="" />
                <span style={{ fontSize: 48, letterSpacing: "-0.03em" }}>paf paf</span>
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
                {t("tagline")}
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
