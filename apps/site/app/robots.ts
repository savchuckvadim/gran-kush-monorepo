import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/modules/shared/config/site";

const robots = (): MetadataRoute.Robots => ({
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: absoluteUrl("/sitemap.xml"),
});

export default robots;
