import { Injectable, Logger } from "@nestjs/common";

import { MailService } from "@modules/mail/application/services/mail.service";
import type { SupportedLanguage } from "@modules/mail/consts/mail.constants";
import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";
import { AuthTokensService } from "@modules/portal/auth/tokens/application/auth-tokens.service";
import { AUTH_TOKEN_PURPOSES } from "@modules/portal/auth/tokens/domain/auth-token";

import { IdentityTicketService } from "../services/identity-ticket.service";

/** Что лежит в ссылке шага почты: для какого приложения и чей профиль провайдера. */
export interface IdentityEmailLinkPayload {
    audience: SessionAudience;
    profile: unknown;
}

/**
 * Шаг «укажите почту» после первого входа через провайдера без почты. Ссылка уходит на названный
 * адрес всегда — и новому, и существующему аккаунту; ответ API одинаковый, поэтому по нему не
 * узнать, есть ли у нас такая почта. Что делать по ссылке, решает `ConfirmIdentityEmailUseCase`:
 * открыть письмо может только владелец адреса.
 */
@Injectable()
export class RequestIdentityEmailUseCase {
    private readonly logger = new Logger(RequestIdentityEmailUseCase.name);

    constructor(
        private readonly tickets: IdentityTicketService,
        private readonly authTokens: AuthTokensService,
        private readonly mail: MailService
    ) {}

    async execute(command: {
        audience: SessionAudience;
        ticket: string;
        email: string;
        language: SupportedLanguage;
    }): Promise<void> {
        const profile = this.tickets.read(command.audience, command.ticket);
        const email = command.email.trim().toLowerCase();
        const { token } = await this.authTokens.issue(
            AUTH_TOKEN_PURPOSES.IdentityEmailLink,
            { email },
            { audience: command.audience, profile } satisfies IdentityEmailLinkPayload
        );
        try {
            await this.mail.sendTelegramEmailLink({
                to: email,
                token,
                language: command.language,
                app: command.audience === "crm" ? "crm" : "member",
            });
        } catch (error: unknown) {
            // ответ не меняется от сбоя почты: человек может запросить письмо ещё раз
            this.logger.error(
                "Identity email link was not queued",
                error instanceof Error ? error.stack : String(error)
            );
        }
    }
}
