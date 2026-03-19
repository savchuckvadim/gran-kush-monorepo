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
    CRM_MEMBERS: "/crm/members",
    CRM_PRODUCTS: "/crm/products",
    CRM_ORDERS: "/crm/orders",
    CRM_ATTENDANCE: "/crm/attendance",
    CRM_FINANCE: "/crm/finance",
    CRM_EMPLOYEES: "/crm/employees",
    CRM_PROFILE: "/crm/profile",
    CRM_SETTINGS: "/crm/settings",
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
