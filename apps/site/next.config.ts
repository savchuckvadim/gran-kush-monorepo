import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { withPayload } from "@payloadcms/next/withPayload";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

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
    // One database and one admin: editors work on the PafPaf build only.
    redirects: async () =>
        site === "pafpaf" ? [] : [{ source: "/admin/:path*", destination: "/", permanent: false }],
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
