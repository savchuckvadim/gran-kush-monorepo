import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { BRAND_COLOR } from "@/modules/shared/config/app-meta";
import { isClubHost, resolveRequestHost } from "@/modules/shared/config/club-routes";

/**
 * Установка на телефон: одно приложение открывается на двух хостах, поэтому имя и описание —
 * по хосту запроса. Кабинет участника — `club.`, всё остальное — CRM.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const club = isClubHost(resolveRequestHost(await headers()));
    return {
        name: club ? "PafPaf Club" : "PafPaf CRM",
        short_name: club ? "PafPaf" : "PafPaf CRM",
        description: club
            ? "Your clubs, QR at the door, shop and orders"
            : "Members, orders and the door of your club",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: BRAND_COLOR,
        icons: [
            { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
            { src: "/apple-icon", sizes: "180x180", type: "image/png" },
        ],
    };
}
