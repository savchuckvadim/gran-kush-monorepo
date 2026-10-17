import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

import { IdentityError } from "../../domain/identity-error";
import {
    type ExternalProfile,
    IDENTITY_PROVIDER_KEYS,
    type ProviderPublicConfig,
    type WidgetIdentityProvider,
} from "../../domain/identity-provider";
import {
    isTelegramAuthValid,
    parseTelegramAuthData,
    toTelegramProfile,
} from "../../domain/telegram-auth";

/**
 * Бот входа у каждой аудитории свой: Telegram Login привязан к одному домену бота (`/setdomain`).
 * Бот кабинета — тот же, через которого клиентам пишет клуб; бот CRM необязателен — без него в CRM
 * нет кнопки Telegram.
 */
const BOT_ENV: Record<SessionAudience, { token: string; username: string }> = {
    cabinet: { token: "TG_CLIENT_BOT_API_KEY", username: "TG_CLIENT_BOT_USERNAME" },
    crm: { token: "TG_CRM_BOT_API_KEY", username: "TG_CRM_BOT_USERNAME" },
};

interface TelegramBot {
    token: string;
    username: string;
    /** Числовая часть токена до двоеточия: с ней фронт открывает окно входа своей кнопкой */
    id: number;
}

/** Telegram Login: виджет присылает подписанный профиль, подпись проверяется ключом бота аудитории. */
@Injectable()
export class TelegramIdentityProvider implements WidgetIdentityProvider {
    readonly key = IDENTITY_PROVIDER_KEYS.Telegram;
    readonly flow = "widget";

    constructor(private readonly config: ConfigService) {}

    isEnabled(audience: SessionAudience): boolean {
        return this.bot(audience) !== null;
    }

    /** id бота секретом не является: его видно и в виджете Telegram. */
    publicConfig(audience: SessionAudience): ProviderPublicConfig {
        const bot = this.bot(audience);
        return { botUsername: bot?.username ?? null, botId: bot?.id ?? null };
    }

    verify(audience: SessionAudience, payload: Record<string, unknown>): ExternalProfile {
        const bot = this.bot(audience);
        if (!bot) throw new IdentityError("off", this.key);
        const data = parseTelegramAuthData(payload);
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (!data || !isTelegramAuthValid(data, bot.token, nowSeconds)) {
            throw new IdentityError("signature", this.key);
        }
        return toTelegramProfile(data);
    }

    private bot(audience: SessionAudience): TelegramBot | null {
        const env = BOT_ENV[audience];
        const token = this.config.get<string>(env.token) || "";
        const username = this.config.get<string>(env.username) || "";
        const id = Number(token.split(":")[0]);
        return token && username && Number.isSafeInteger(id) && id > 0
            ? { token, username, id }
            : null;
    }
}
