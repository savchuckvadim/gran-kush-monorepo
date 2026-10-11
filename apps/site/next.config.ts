import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { withPayload } from "@payloadcms/next/withPayload";
import path from "path";
import { fileURLToPath } from "url";

import { LOCALES } from "./modules/shared/config/locales";
import { HOME_SLUG } from "./modules/shared/config/routes";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Next streams metadata into <body> unless the user agent is on this list. Its default list leaves
// out Googlebot and Telegram; this one catches any crawler or link preview by the usual words.
const HTML_LIMITED_BOTS =
    /bot|crawl|spider|slurp|preview|facebookexternalhit|facebookcatalog|[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|yandex|baiduspider|sogou|vkShare|quora link preview|ia_archiver|tumblr|WhatsApp|Yeti|googleweblight/i;

// Only frame-ancestors: a full CSP would break the Payload admin. 'self' keeps a same-origin
// live preview working.
const SECURITY_HEADERS = [
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

// One codebase, one build per product site: the build picks its theme (styles and fonts).
const SITES = ["pafpaf", "nagual"];
const site = SITES.find((name) => name === process.env.NEXT_PUBLIC_SITE) ?? "pafpaf";
const siteTheme = `./modules/sites/${site}/theme.ts`;

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
    reactStrictMode: true,
    output: "standalone",
    images: {
        localPatterns: [{ pathname: "/api/media/file/**" }],
    },
    htmlLimitedBots: HTML_LIMITED_BOTS,
    headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
    redirects: async () => [
        // The home page lives at /{locale}; its CMS slug must not be a second address.
        {
            source: `/:locale(${LOCALES.join("|")})/${HOME_SLUG}`,
            destination: "/:locale",
            permanent: true,
        },
        // One database and one admin: editors work on the PafPaf build only.
        ...(site === "pafpaf"
            ? []
            : [{ source: "/admin/:path*", destination: "/", permanent: false }]),
    ],
    webpack: (webpackConfig) => {
        webpackConfig.resolve.extensionAlias = {
            ".cjs": [".cts", ".cjs"],
            ".js": [".ts", ".tsx", ".js", ".jsx"],
            ".mjs": [".mts", ".mjs"],
        };
        webpackConfig.resolve.alias = {
            ...webpackConfig.resolve.alias,
            "@site/theme": path.resolve(dirname, siteTheme),
        };
        return webpackConfig;
    },
    turbopack: {
        root: path.resolve(dirname, "../.."),
        resolveAlias: {
            "@site/theme": siteTheme,
        },
    },
};

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false });
