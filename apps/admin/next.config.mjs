import createNextIntlPlugin from "next-intl/plugin";

import { fileURLToPath } from "node:url";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
    transpilePackages: ["@workspace/ui", "@workspace/api-client"],
    async headers() {
        return [
            {
                // Токены сброса/подтверждения живут в URL страниц: не отдаём их в Referer
                source: "/:path*",
                headers: [{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }],
            },
        ];
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
