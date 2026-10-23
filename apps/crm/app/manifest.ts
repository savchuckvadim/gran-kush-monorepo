import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { BRAND_COLOR } from "@/modules/shared/config/app-meta";
import { BRAND } from "@/modules/shared/config/brand";
import { isClubHost, resolveRequestHost } from "@/modules/shared/config/club-routes";

/** What the installed app says about itself: clubs have a door, studios have clients. */
const DESCRIPTIONS = {
    club: {
        cabinet: "Your clubs, QR at the door, shop and orders",
        crm: "Members, orders and the door of your club",
    },
    studio: {
        cabinet: "Your studios, visits and orders",
        crm: "Clients, orders and the team of your studio",
    },
} as const;

/**
 * Установка на телефон: одно приложение открывается на двух хостах, поэтому имя и описание —
 * по хосту запроса. Кабинет — хост из `NEXT_PUBLIC_MEMBER_URL`, всё остальное — CRM.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const cabinet = isClubHost(resolveRequestHost(await headers()));
    const texts = DESCRIPTIONS[BRAND.portalType === "CLUB" ? "club" : "studio"];
    const crmName = `${BRAND.name} CRM`;
    return {
        name: cabinet ? BRAND.cabinetName : crmName,
        short_name: cabinet ? BRAND.name : crmName,
        description: cabinet ? texts.cabinet : texts.crm,
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: BRAND_COLOR,
        icons: [
            { src: "/icon", sizes: "any", type: "image/svg+xml" },
            { src: "/apple-icon", sizes: "180x180", type: "image/png" },
        ],
    };
}
