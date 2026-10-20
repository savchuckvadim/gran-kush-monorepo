/** Кому уведомление: сотруднику в CRM или участнику в кабинете — всегда в пределах клуба. */
export type NotificationRecipient =
    | { kind: "employee"; employeeId: string }
    | { kind: "member"; memberId: string };

/** Ключ адресата: уникальность (событие, адресат) и выборка «мои уведомления». */
export const recipientKey = (recipient: NotificationRecipient): string =>
    recipient.kind === "employee"
        ? `employee:${recipient.employeeId}`
        : `member:${recipient.memberId}`;

/** Параметры текста уведомления: номер заказа, стадия, клуб — без персональных данных. */
export type NotificationParams = Record<string, string | number | NotificationLabel | null>;

/** Название, которое клуб задал на нескольких языках (стадия воронки). */
export interface NotificationLabel {
    label: string;
    labelI18n: Record<string, string> | null;
}

/** Типы уведомлений; текст — `notifications.types.<type>` в i18n клиента и в Telegram. */
export const NOTIFICATION_TYPES = {
    orderPlaced: "order.placed",
    orderCancelledByMember: "order.cancelled_by_member",
    orderStageChanged: "order.stage_changed",
    orderCancelledByStaff: "order.cancelled_by_staff",
} as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/** Уведомление до адресатов: что случилось, о чём (куда ведёт нажатие) и параметры текста. */
export interface NotificationDraft {
    portalId: string;
    eventId: string;
    type: NotificationType;
    subject: { kind: string; id: string };
    params: NotificationParams;
}

export interface NewNotification extends NotificationDraft {
    recipient: NotificationRecipient;
}

export interface Notification {
    id: string;
    type: string;
    subjectKind: string;
    subjectId: string;
    params: NotificationParams;
    readAt: Date | null;
    createdAt: Date;
}

/** Внешний канал уведомлений аккаунта; в приложении уведомления есть всегда. */
export const NOTIFICATION_CHANNELS = { telegram: "telegram" } as const;
export type NotificationChannel =
    (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];
