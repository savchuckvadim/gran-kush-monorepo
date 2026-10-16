import createNextIntlPlugin from "next-intl/plugin";

import { fileURLToPath } from "node:url";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

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
