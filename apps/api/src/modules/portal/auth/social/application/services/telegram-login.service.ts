import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";

import { createHmac } from "crypto";

import { JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";
import {
    isTelegramAuthValid,
    type TelegramAuthData,
    type TelegramProfile,
    toTelegramProfile,
} from "@modules/portal/auth/social/domain/telegram-auth";
import { TelegramAuthError } from "@modules/portal/auth/social/domain/telegram-auth-error";

/** Бот кабинета: тот же, через которого клиентам потом пишет клуб. */
const BOT_TOKEN_ENV = "TG_CLIENT_BOT_API_KEY";
const BOT_USERNAME_ENV = "TG_CLIENT_BOT_USERNAME";

/** Шаг «укажите почту» — полчаса; ссылка из письма — сутки, как подтверждение почты. */
const SIGN_UP_TICKET_TTL = "30m" as const;
const EMAIL_LINK_TTL = "24h" as const;

const PURPOSE = { ticket: "telegram_sign_up", emailLink: "telegram_email_link" } as const;

interface TicketPayload {
    purpose: typeof PURPOSE.ticket;
    profile: TelegramProfile;
}

interface EmailLinkPayload {
    purpose: typeof PURPOSE.emailLink;
    profile: TelegramProfile;
    email: string;
}

/**
 * Вход через Telegram Login: проверка ответа виджета и подписанные шаги до подтверждения почты.
 * У Telegram нет email, а аккаунт PafPaf держится на почте (письма клубов, согласия), поэтому
 * новый Telegram сначала получает «билет» на шаг «укажите почту», затем ссылку в письмо. Оба —
 * подписанные JWT со своим назначением: ни один не подходит вместо другого и вместо сессии.
 */
@Injectable()
export class TelegramLoginService {
    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) {}

    /**
     * Кнопка показывается, только когда бот настроен целиком. `botId` — числовая часть токена до
     * двоеточия: с ним фронт открывает окно входа Telegram своей кнопкой. Секретом он не является,
     * его видно и в виджете Telegram.
     */
    config(): { enabled: boolean; botUsername: string | null; botId: number | null } {
        const botUsername = this.configService.get<string>(BOT_USERNAME_ENV) || null;
        const botId = Number(this.botToken()?.split(":")[0]) || null;
        return { enabled: Boolean(botId && botUsername), botUsername, botId };
    }

    verify(data: TelegramAuthData, now = new Date()): TelegramProfile {
        const token = this.botToken();
        if (!token || !this.config().enabled) throw new TelegramAuthError("telegram_off");
        if (!isTelegramAuthValid(data, token, Math.floor(now.getTime() / 1000))) {
            throw new TelegramAuthError("telegram_signature");
        }
        return toTelegramProfile(data);
    }

    issueSignUpTicket(profile: TelegramProfile): string {
        return this.sign(
            { purpose: PURPOSE.ticket, profile } satisfies TicketPayload,
            SIGN_UP_TICKET_TTL
        );
    }

    readSignUpTicket(ticket: string): TelegramProfile {
        const payload = this.read<TicketPayload>(ticket, PURPOSE.ticket, "telegram_ticket");
        return payload.profile;
    }

    issueEmailLink(profile: TelegramProfile, email: string): string {
        return this.sign(
            { purpose: PURPOSE.emailLink, profile, email } satisfies EmailLinkPayload,
            EMAIL_LINK_TTL
        );
    }

    readEmailLink(token: string): { profile: TelegramProfile; email: string } {
        const payload = this.read<EmailLinkPayload>(token, PURPOSE.emailLink, "telegram_link");
        return { profile: payload.profile, email: payload.email };
    }

    private botToken(): string | null {
        return this.configService.get<string>(BOT_TOKEN_ENV) || null;
    }

    private sign(payload: object, expiresIn: JwtSignOptions["expiresIn"]): string {
        return this.jwtService.sign(payload, { secret: this.secret(), expiresIn });
    }

    private read<T extends { purpose: string }>(
        token: string,
        purpose: T["purpose"],
        failure: "telegram_ticket" | "telegram_link"
    ): T {
        let payload: T;
        try {
            payload = this.jwtService.verify<T>(token, { secret: this.secret() });
        } catch {
            throw new TelegramAuthError(failure);
        }
        if (payload.purpose !== purpose) throw new TelegramAuthError(failure);
        return payload;
    }

    /** Свой ключ: подпись билета не совпадёт ни с access-токеном, ни с state входа через Google. */
    private secret(): string {
        return createHmac("sha256", this.configService.getOrThrow<string>(JWT_ENV_KEYS.SECRET))
            .update("telegram-sign-in:v1")
            .digest("hex");
    }
}
