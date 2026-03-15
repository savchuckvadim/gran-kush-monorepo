/**
 * Mail module events constants
 * All mail-related events are defined here for centralized management
 */
import { APP_EVENTS } from "@common/events/events.constants";

/**
 * Mail queue job names
 */
export const MAIL_QUEUE_JOB_NAMES = {
    SEND_EMAIL: "send-email",
} as const;

/**
 * Mail queue name
 */
export const MAIL_QUEUE_NAME = "mail" as const;

/**
 * Mail worker events (extends common queue events)
 */
export const MAIL_WORKER_EVENTS = {
    ...APP_EVENTS.QUEUE,
} as const;

/**
 * Email types enum
 */
export enum EmailType {
    VERIFICATION = "verification",
    PASSWORD_RESET = "password-reset",
    OTHER = "other",
}

/**
 * Email type labels for logging
 */
export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
    [EmailType.VERIFICATION]: "Email Verification",
    [EmailType.PASSWORD_RESET]: "Password Reset",
    [EmailType.OTHER]: "Other",
} as const;
