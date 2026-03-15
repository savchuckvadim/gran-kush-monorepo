/**
 * Common application events constants
 * Centralized location for all application-wide events
 */

export const APP_EVENTS = {
    // Queue events
    QUEUE: {
        COMPLETED: "completed",
        FAILED: "failed",
        ACTIVE: "active",
        STALLED: "stalled",
        PROGRESS: "progress",
        REMOVED: "removed",
    },
} as const;

export type AppEventType = (typeof APP_EVENTS.QUEUE)[keyof typeof APP_EVENTS.QUEUE];
