/**
 * Application routes constants
 * Centralized location for all route paths
 */

export const ROUTES = {
    HOME: "/",
    ABOUT: "/about-us",
    CONTACTS: "/contacts",
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    CONFIRM_EMAIL: "/auth/confirm-email",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    PROFILE: "/profile",
    PROFILE_SETTINGS: "/profile/settings",
    PROFILE_QR_CODE: "/profile/qr-code",
    PROFILE_PRESENCE: "/profile/presence",
    PRIVACY: "/privacy",
    TERMS: "/terms",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
