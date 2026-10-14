import { Injectable, Logger } from "@nestjs/common";

import { TelegramService } from "@common/telegram/telegram.service";

import { errorText } from "../application/error-text";
import { JanitorNotifier } from "../domain/janitor-notifier";

/** The platform chat (TG_BOT_API_KEY / TG_BOT_CHAT_ID); without them messages only reach the log. */
@Injectable()
export class TelegramJanitorNotifier extends JanitorNotifier {
    private readonly logger = new Logger(TelegramJanitorNotifier.name);

    constructor(private readonly telegram: TelegramService) {
        super();
    }

    async notify(text: string): Promise<void> {
        try {
            await this.telegram.sendMessage(text);
        } catch (error) {
            this.logger.warn(`message not delivered: ${errorText(error)}`);
        }
    }
}
