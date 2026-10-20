import { Injectable } from "@nestjs/common";

import type { DomainEvent } from "@workspace/domain-events";

import { PublicUrlsService } from "@common/config/public-urls/public-urls.service";
import type { ContentLocale } from "@common/i18n";
import { OnDomainEvent } from "@modules/events";

import { NOTIFICATION_CHANNELS, type NotificationParams } from "../domain/notification";
import { NotificationDirectory } from "../domain/notification-directory.interface";
import { NotificationRepository } from "../domain/notification-repository.interface";
import { openLabel, renderNotification, telegramLocale } from "../domain/notification-texts";
import { type TelegramBotApp, TelegramBotClient } from "../infrastructure/telegram-bot.client";

/**
 * Уведомление в Telegram: участнику — ботом кабинета, сотруднику — ботом CRM. Пишем только тем,
 * кто входил через Telegram (бот получил право писать) и не выключил канал. Отдельный
 * потребитель: сбой Telegram повторяет только отправку, уведомление в приложении уже есть.
 */
@Injectable()
export class TelegramNotificationsConsumer {
    constructor(
        private readonly directory: NotificationDirectory,
        private readonly repository: NotificationRepository,
        private readonly telegram: TelegramBotClient,
        private readonly urls: PublicUrlsService
    ) {}

    @OnDomainEvent("notification.created")
    async onCreated(event: DomainEvent<"notification.created">): Promise<void> {
        const { payload } = event;
        const portalId = event.portalId;
        const app: TelegramBotApp = payload.recipientKind === "member" ? "cabinet" : "crm";
        if (!portalId || !this.telegram.enabled(app)) return;

        const userId = await this.userOf(portalId, payload.employeeId, payload.memberId);
        if (!userId) return;
        if (!(await this.repository.channelEnabled(userId, NOTIFICATION_CHANNELS.telegram))) return;
        const address = await this.directory.telegramOf(userId);
        if (!address) return;

        const locale = telegramLocale(address.locale);
        const params = payload.params as NotificationParams;
        const text = renderNotification(payload.type, params, locale);
        if (!text) return;
        const url = await this.link(app, portalId, payload.subjectKind, payload.subjectId, locale);
        await this.telegram.send(
            app,
            address.chatId,
            text,
            url ? { label: openLabel(locale), url } : null
        );
    }

    private async userOf(
        portalId: string,
        employeeId: string | null,
        memberId: string | null
    ): Promise<string | null> {
        if (memberId) return (await this.directory.member(portalId, memberId))?.userId ?? null;
        return employeeId ? this.directory.userOfEmployee(portalId, employeeId) : null;
    }

    /** Ссылка на то, о чём уведомление: заказ в кабинете или в CRM клуба. */
    private async link(
        app: TelegramBotApp,
        portalId: string,
        subjectKind: string,
        subjectId: string,
        locale: ContentLocale
    ): Promise<string | null> {
        if (subjectKind !== "order") return null;
        const slug = await this.directory.clubSlug(portalId);
        if (!slug) return null;
        return app === "cabinet"
            ? `${this.urls.cabinet}/${locale}/${slug}/orders/${subjectId}`
            : `${this.urls.crm}/${locale}/${slug}/crm/order/details/${subjectId}`;
    }
}
