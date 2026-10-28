import createNextIntlPlugin from "next-intl/plugin";

import { fileURLToPath } from "node:url";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

// CSP only closes framing, <base> and plugins: script-src would need nonces for Next and the Google
// and Telegram sign-in scripts. 'self' keeps the same-origin iframe used to check the mobile width.
// Referrer-Policy: reset and confirmation tokens live in page URLs and must not leak in Referer.
const SECURITY_HEADERS = [
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    // Кабинет открывается на хосте club.*; в dev-режиме Next пускает к своим ресурсам только
    // localhost и его поддомены. Для локальной проверки сессии нужен общий сайт у кабинета и API
    // (Lax-куки не уходят между разными сайтами), поэтому club.lvh.me и api.lvh.me (lvh.me
    // всегда указывает на 127.0.0.1)
    allowedDevOrigins: ["*.lvh.me"],
    outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
    transpilePackages: ["@workspace/ui", "@workspace/api-client"],
    async headers() {
        return [{ source: "/:path*", headers: SECURITY_HEADERS }];
    },
    async redirects() {
        return [
            // Redirect /home to root for each locale
            {
                source: "/:locale/home",
                destination: "/:locale",
                permanent: true,
            },
        ];
    },
};

export default withNextIntl(nextConfig);
