import type { Notification } from "../domain/notification";

import type { NotificationDto } from "./dto/notification.dto";

export const toNotificationDto = (notification: Notification): NotificationDto => ({
    id: notification.id,
    type: notification.type,
    subjectKind: notification.subjectKind,
    subjectId: notification.subjectId,
    params: notification.params,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
});
