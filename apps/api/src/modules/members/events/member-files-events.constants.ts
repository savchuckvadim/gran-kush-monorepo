import { APP_EVENTS } from "@common/events/events.constants";

export const MEMBER_FILES_QUEUE_NAME = "member-files";

export const MEMBER_FILES_QUEUE_JOB_NAMES = {
    SAVE_MEMBER_FILES: "save-member-files",
} as const;

export const MEMBER_FILES_WORKER_EVENTS = {
    COMPLETED: APP_EVENTS.QUEUE.COMPLETED,
    FAILED: APP_EVENTS.QUEUE.FAILED,
} as const;
