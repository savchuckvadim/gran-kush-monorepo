import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { createHmac } from "crypto";

import { JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";
import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

import { IdentityError } from "../../domain/identity-error";
import { type ExternalProfile, parseExternalProfile } from "../../domain/identity-provider";

/** Шаг «укажите почту» открыт полчаса. */
const TICKET_TTL = "30m";
const TICKET_PURPOSE = "identity_email_step";

interface TicketPayload {
    purpose: typeof TICKET_PURPOSE;
    audience: SessionAudience;
    profile: ExternalProfile;
}

/**
 * Билет на шаг «укажите почту»: провайдер подтвердил человека, но не адрес (у Telegram его нет).
 * Подписанный JWT со своим назначением и аудиторией — не годится ни вместо сессии, ни в другом
 * приложении. Сам по себе ничего не открывает: аккаунт появится только после ссылки из письма.
 */
@Injectable()
export class IdentityTicketService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    issue(audience: SessionAudience, profile: ExternalProfile): string {
        return this.jwtService.sign(
            { purpose: TICKET_PURPOSE, audience, profile } satisfies TicketPayload,
            { secret: this.secret(), expiresIn: TICKET_TTL }
        );
    }

    read(audience: SessionAudience, ticket: string): ExternalProfile {
        let payload: Partial<TicketPayload>;
        try {
            payload = this.jwtService.verify<TicketPayload>(ticket, { secret: this.secret() });
        } catch {
            throw new IdentityError("ticket");
        }
        const profile = parseExternalProfile(payload.profile);
        if (payload.purpose !== TICKET_PURPOSE || payload.audience !== audience || !profile) {
            throw new IdentityError("ticket");
        }
        return profile;
    }

    private secret(): string {
        return createHmac("sha256", this.configService.getOrThrow<string>(JWT_ENV_KEYS.SECRET))
            .update("identity-ticket:v1")
            .digest("hex");
    }
}
