import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const SECURITY_HEADERS = [
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Same as the product sites: no foreign framing, same-origin previews still work.
    { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
    reactStrictMode: true,
    output: "standalone",
    headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
    turbopack: {
        root: path.resolve(dirname, "../.."),
    },
};

export default withNextIntl(nextConfig);
