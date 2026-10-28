import createNextIntlPlugin from "next-intl/plugin";

import { fileURLToPath } from "node:url";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

// The platform admin is never framed. CSP only closes framing, <base> and plugins: script-src would
// need nonces for Next. Referrer-Policy: reset tokens live in page URLs and must not leak in Referer.
const SECURITY_HEADERS = [
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
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
