import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** Чей бот пишет: участникам — бот кабинета, персоналу — бот CRM (те же, что для входа). */
export type TelegramBotApp = "cabinet" | "crm";

const BOT_TOKEN_ENV: Record<TelegramBotApp, string> = {
    cabinet: "TG_CLIENT_BOT_API_KEY",
    crm: "TG_CRM_BOT_API_KEY",
};

/** Значение токена, которым бот выключают в dev и e2e: письма в Telegram не уходят. */
const DISABLED_TOKEN = "disabled";
const SEND_TIMEOUT_MS = 10_000;
/** Пользователь заблокировал бота или не разрешал писать — повтор не поможет. */
const UNREACHABLE_STATUS = 403;

export interface TelegramButton {
    label: string;
    url: string;
}

/**
 * Сообщение в личку через Bot API. Без токена бота канал выключен (молча). Ошибка сети или
 * 5xx — исключение: доставка события повторится по правилам очереди.
 */
@Injectable()
export class TelegramBotClient {
    private readonly logger = new Logger(TelegramBotClient.name);

    constructor(private readonly config: ConfigService) {}

    enabled(app: TelegramBotApp): boolean {
        return this.token(app) !== null;
    }

    async send(
        app: TelegramBotApp,
        chatId: string,
        text: string,
        button: TelegramButton | null
    ): Promise<void> {
        const token = this.token(app);
        if (!token) return;
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                link_preview_options: { is_disabled: true },
                ...(button
                    ? {
                          reply_markup: {
                              inline_keyboard: [[{ text: button.label, url: button.url }]],
                          },
                      }
                    : {}),
            }),
            signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        });
        if (response.status === UNREACHABLE_STATUS) {
            this.logger.warn(`Telegram ${app}: чат ${chatId} недоступен боту (403)`);
            return;
        }
        if (!response.ok) throw new Error(`Telegram sendMessage failed: ${response.status}`);
    }

    private token(app: TelegramBotApp): string | null {
        const value = this.config.get<string>(BOT_TOKEN_ENV[app])?.trim();
        return value && value !== DISABLED_TOKEN ? value : null;
    }
}
