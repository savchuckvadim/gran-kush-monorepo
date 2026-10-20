import { Injectable } from "@nestjs/common";

import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import type { DomainEvent } from "@workspace/domain-events";

import { OnDomainEvent } from "@modules/events";
import { MailService } from "@modules/mail/application/services/mail.service";
import type { SupportedLanguage } from "@modules/mail/consts/mail.constants";

/**
 * Приветственное письмо владельцу нового клуба. Повтор доставки письмо не дублирует: у письма
 * портала фиксированный `jobId` в очереди почты.
 */
@Injectable()
export class WelcomeLetterConsumer {
    constructor(
        private readonly mail: MailService,
        private readonly users: UserRepository
    ) {}

    @OnDomainEvent("portal.founded")
    async onPortalFounded(event: DomainEvent<"portal.founded">): Promise<void> {
        const { payload } = event;
        const owner = await this.users.findById(payload.ownerUserId);
        if (!owner || !event.portalId) return;
        await this.mail.sendPortalRegistrationEmail({
            portal: {
                id: event.portalId,
                name: payload.portalSlug,
                displayName: payload.portalDisplayName,
            },
            owner: { id: payload.ownerEmployeeId, email: owner.email, name: payload.ownerName },
            language: payload.language as SupportedLanguage | undefined,
        });
    }
}
