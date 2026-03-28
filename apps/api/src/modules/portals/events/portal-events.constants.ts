import { SupportedLanguage } from "../../mail/consts/mail.constants";

export const PORTAL_EVENTS_QUEUE_NAME = "portal-events" as const;

export const PORTAL_EVENTS_JOB_NAMES = {
    PORTAL_REGISTRATION_INIT: "portal-registration-init",
    PORTAL_REGISTRATION_EMAIL_CONFIRMED: "portal-registration-email-confirmed",
} as const;

export type PortalRegistrationEventLanguage = SupportedLanguage;

export type PortalRegistrationInitPayload = {
    portalId: string;
    portalSlug: string;
    portalDisplayName: string;
    ownerId: string;
    ownerEmail: string;
    ownerName: string;
    language?: PortalRegistrationEventLanguage;
};

// Sent after welcome/registration email has been actually sent.
export type PortalRegistrationEmailConfirmedPayload = PortalRegistrationInitPayload & {
    emailSentAt: string; // ISO
};
