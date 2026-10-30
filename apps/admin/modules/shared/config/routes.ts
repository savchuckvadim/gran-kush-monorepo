import { BRAND } from "./brand";

/** Маршруты платформенной админки без префикса языка. */
export const ROUTES = {
    /** Клубы и их подписки */
    CLUBS: "/clubs",
    /** Тарифы */
    PLANS: "/plans",
    LOGIN: "/auth/login",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/** Публичный адрес CRM: из него собирается ссылка на скрытый тариф. */
export const CRM_PUBLIC_URL = (
    process.env.NEXT_PUBLIC_CRM_URL || `https://${BRAND.domains.crm}`
).replace(/\/$/, "");
