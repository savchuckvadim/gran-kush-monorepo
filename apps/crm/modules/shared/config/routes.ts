/**
 * Application routes constants
 * Centralized location for all route paths
 */

export const ROUTES = {
    HOME: "/",
    ABOUT: "/about-us",
    CONTACTS: "/contacts",
    PROFILE: "/profile",
    PROFILE_SETTINGS: "/profile/settings",
    CONFIRM_EMAIL: "/auth/confirm-email",
    FORGOT_PASSWORD: "/auth/forgot-password",
    PRIVACY: "/privacy",
    TERMS: "/terms",
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
