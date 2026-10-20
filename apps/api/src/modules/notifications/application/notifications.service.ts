import { Injectable } from "@nestjs/common";

import {
    NOTIFICATION_CHANNELS,
    type NotificationRecipient,
    recipientKey,
} from "../domain/notification";
import { NotificationDirectory } from "../domain/notification-directory.interface";
import {
    type NotificationPage,
    NotificationRepository,
} from "../domain/notification-repository.interface";

/** Сколько уведомлений отдаём за раз и сколько можно попросить. */
export const NOTIFICATION_PAGE = { default: 20, max: 50 } as const;

export interface NotificationPreferences {
    telegram: boolean;
    /** Есть ли у аккаунта вход через Telegram — без него писать некуда */
    telegramLinked: boolean;
}

/** Колокольчик адресата: свои уведомления в клубе, «прочитано» и каналы аккаунта. */
@Injectable()
export class NotificationsService {
    constructor(
        private readonly repository: NotificationRepository,
        private readonly directory: NotificationDirectory
    ) {}

    async list(
        portalId: string,
        recipient: NotificationRecipient,
        options: { cursor?: string; limit?: number }
    ): Promise<NotificationPage & { unread: number }> {
        const key = recipientKey(recipient);
        const limit = Math.min(options.limit ?? NOTIFICATION_PAGE.default, NOTIFICATION_PAGE.max);
        const [page, unread] = await Promise.all([
            this.repository.page(portalId, key, { cursor: options.cursor ?? null, limit }),
            this.repository.countUnread(portalId, key),
        ]);
        return { ...page, unread };
    }

    unread(portalId: string, recipient: NotificationRecipient): Promise<number> {
        return this.repository.countUnread(portalId, recipientKey(recipient));
    }

    markRead(
        portalId: string,
        recipient: NotificationRecipient,
        ids: readonly string[] | null
    ): Promise<void> {
        return this.repository.markRead(portalId, recipientKey(recipient), ids);
    }

    async preferences(userId: string): Promise<NotificationPreferences> {
        const [telegram, address] = await Promise.all([
            this.repository.channelEnabled(userId, NOTIFICATION_CHANNELS.telegram),
            this.directory.telegramOf(userId),
        ]);
        return { telegram, telegramLinked: address !== null };
    }

    async setTelegram(userId: string, enabled: boolean): Promise<NotificationPreferences> {
        await this.repository.setChannel(userId, NOTIFICATION_CHANNELS.telegram, enabled);
        return this.preferences(userId);
    }
}
