import { Injectable } from "@nestjs/common";

import type { DomainEvent } from "@workspace/domain-events";

import { TelegramService } from "@common/telegram/telegram.service";
import { OnDomainEvent } from "@modules/events";

/** Алерт платформе в Telegram о новом клубе. Отдельный потребитель: сбой Telegram не задерживает письмо. */
@Injectable()
export class PlatformAlertConsumer {
    constructor(private readonly telegram: TelegramService) {}

    @OnDomainEvent("portal.founded")
    async onPortalFounded(event: DomainEvent<"portal.founded">): Promise<void> {
        await this.telegram.sendPortalRegistrationNotification({
            portalSlug: event.payload.portalSlug,
            portalDisplayName: event.payload.portalDisplayName,
        });
    }
}
