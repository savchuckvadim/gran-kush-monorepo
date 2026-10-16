import { Injectable, Logger } from "@nestjs/common";

import { MailService } from "@modules/mail/application/services/mail.service";
import type { SupportedLanguage } from "@modules/mail/consts/mail.constants";

import { TelegramLoginService } from "../services/telegram-login.service";

/**
 * Шаг «укажите почту» после первого входа через Telegram. Ссылка уходит на названный адрес
 * всегда — и новому, и уже существующему аккаунту; ответ API одинаковый, поэтому по нему
 * не узнать, есть ли у нас такая почта. Что делать по ссылке (завести аккаунт или привязать
 * Telegram к существующему), решает `ConfirmTelegramEmailUseCase`: открыть письмо может только
 * владелец адреса.
 */
@Injectable()
export class RequestTelegramEmailUseCase {
    private readonly logger = new Logger(RequestTelegramEmailUseCase.name);

    constructor(
        private readonly telegram: TelegramLoginService,
        private readonly mail: MailService
    ) {}

    async execute(command: {
        ticket: string;
        email: string;
        language: SupportedLanguage;
    }): Promise<void> {
        const profile = this.telegram.readSignUpTicket(command.ticket);
        const email = command.email.trim().toLowerCase();
        const token = this.telegram.issueEmailLink(profile, email);
        try {
            await this.mail.sendTelegramEmailLink({ to: email, token, language: command.language });
        } catch (error: unknown) {
            // ответ не меняется от сбоя почты: человек может запросить письмо ещё раз
            this.logger.error(
                "Telegram sign-in email was not queued",
                error instanceof Error ? error.stack : String(error)
            );
        }
    }
}
