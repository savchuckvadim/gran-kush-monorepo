import type { NewNotification, Notification, NotificationChannel } from "./notification";

export interface NotificationPage {
    items: Notification[];
    /** Курсор следующей страницы (id последнего); `null` — дальше ничего */
    nextCursor: string | null;
}

/** Уведомления адресата в клубе и каналы аккаунта. */
export abstract class NotificationRepository {
    /**
     * Создать уведомления и событие `notification.created` на каждое — одной транзакцией. Повтор
     * доставки того же события не дублирует: (событие, адресат) уникальны.
     */
    abstract createMany(notifications: readonly NewNotification[]): Promise<number>;

    abstract page(
        portalId: string,
        recipientKey: string,
        options: { cursor: string | null; limit: number }
    ): Promise<NotificationPage>;

    abstract countUnread(portalId: string, recipientKey: string): Promise<number>;

    /** Прочитать: перечисленные или все непрочитанные адресата. */
    abstract markRead(
        portalId: string,
        recipientKey: string,
        ids: readonly string[] | null
    ): Promise<void>;

    abstract findById(id: string): Promise<(Notification & { portalId: string }) | null>;

    /** Включён ли канал у аккаунта; строки нет — включён. */
    abstract channelEnabled(userId: string, channel: NotificationChannel): Promise<boolean>;

    abstract setChannel(
        userId: string,
        channel: NotificationChannel,
        enabled: boolean
    ): Promise<void>;
}
