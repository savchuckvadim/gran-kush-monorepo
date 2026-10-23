/**
 * Application routes constants
 * Centralized location for all route paths
 */

import { BRAND } from "./brand";

export const ROUTES = {
    HOME: "/",
    PROFILE: "/profile",
    PROFILE_SETTINGS: "/profile/settings",
    CONFIRM_EMAIL: "/auth/confirm-email",
    FORGOT_PASSWORD: "/auth/forgot-password",
    PRIVACY: "/privacy",
    TERMS: "/terms",
    /** Платформенная админка: клубы и их подписки */
    CLUBS: "/clubs",
    /** Платформенная админка: тарифы */
    PLANS: "/plans",
    CRM_HOME: "/crm",
    /** Префикс раздела клиентов: list, details, new */
    CRM_MEMBER_BASE: "/crm/member",
    /** Список клиентов (member/list) */
    CRM_MEMBERS: "/crm/member/list",
    /** Префикс карточки клиента: `${ROUTES.CRM_MEMBER_DETAILS}/${id}` */
    CRM_MEMBER_DETAILS: "/crm/member/details",
    CRM_MEMBER_NEW: "/crm/member/new",
    CRM_PRODUCT_BASE: "/crm/product",
    /** Список товаров */
    CRM_PRODUCTS: "/crm/product/list",
    CRM_PRODUCT_DETAILS: "/crm/product/details",
    CRM_ORDER_BASE: "/crm/order",
    /** Список заказов */
    CRM_ORDERS: "/crm/order/list",
    CRM_ORDER_DETAILS: "/crm/order/details",
    CRM_ATTENDANCE: "/crm/attendance",
    CRM_FINANCE: "/crm/finance",
    CRM_EMPLOYEES: "/crm/employees",
    CRM_PROFILE: "/crm/profile",
    CRM_SETTINGS: "/crm/settings",
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/** Публичный адрес CRM: из него собирается ссылка на скрытый тариф. */
export const CRM_PUBLIC_URL = (
    process.env.NEXT_PUBLIC_CRM_URL || `https://${BRAND.domains.crm}`
).replace(/\/$/, "");

/** Product site with the legal pages: `${SITE_PUBLIC_URL}/{locale}/legal/{doc}`. */
export const SITE_PUBLIC_URL = (
    process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domains.site}`
).replace(/\/$/, "");
