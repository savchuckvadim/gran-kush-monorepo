import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { CookieOptions } from "express";

import { JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";
import { GoogleOAuthGateway } from "@modules/portal/auth/social/domain/google-oauth.gateway";
import { GoogleProfile } from "@modules/portal/auth/social/domain/social-profile";

export type SocialApp = "member" | "crm";

export const SOCIAL_LOCALES = ["ru", "en", "es"] as const;
const DEFAULT_LOCALE = "es";

/** Имя куки, которая привязывает вход к браузеру, начавшему его. */
export const OAUTH_FLOW_COOKIE = "google_oauth_flow";

const STATE_PURPOSE = "google_oauth";
const STATE_TTL = "10m";
const FLOW_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

/** Куда ведёт вход, если фронт не назвал страницу возврата. */
const DEFAULT_LANDING: Record<SocialApp, (locale: string) => string> = {
    // CRM сама решает по клубам, куда отправить
    crm: (locale) => `/${locale}`,
    // Кабинет участника: его главная (мои клубы), а не лендинг
    member: (locale) => `/${locale}`,
};

interface OAuthState {
    purpose: string;
    app: SocialApp;
    locale: string;
    /** Привязка к браузеру: то же значение лежит в HttpOnly-куке и сверяется в callback. */
    nonce: string;
    /** Относительный путь возврата, уже проверенный по правилам `sanitizeReturnTo`. */
    returnTo?: string;
}

/** Секреты одного входа; ключ PKCE наружу не выходит — только в HttpOnly-куке. */
export interface OAuthBinding {
    nonce: string;
    codeVerifier: string;
}

/** Почему вход отклонён. Попадает в лог (без персональных данных); пользователь видит общую ошибку. */
export type GoogleFlowFailure =
    | "state_missing"
    | "state_invalid"
    | "binding_missing"
    | "binding_mismatch"
    | "provider_error"
    | "nonce_mismatch"
    | "exchange_failed";

export class GoogleFlowError extends Error {
    constructor(readonly reason: GoogleFlowFailure) {
        super(`Google OAuth flow rejected: ${reason}`);
    }
}

/**
 * Редирект-флоу Google OAuth и всё, что его защищает.
 *
 * Что может пойти не так и чем это закрыто:
 *
 * - **Подмена входа (login CSRF).** Атакующий начинает вход, получает ссылку возврата с
 *   СВОИМ кодом и подсовывает её жертве: жертва оказывается в аккаунте атакующего. Защита:
 *   `state` подписан сервером и содержит nonce, тот же nonce лежит в HttpOnly-куке браузера,
 *   который начал вход. Чужой браузер куки не имеет — callback отклоняется.
 * - **Перехват кода.** Код, украденный по пути, без `code_verifier` бесполезен: Google
 *   принимает обмен только с тем verifier, хеш которого пришёл в начале (PKCE, S256).
 *   Verifier живёт только в куке и никогда не попадает в адрес.
 * - **Подмена id_token.** Тот же nonce уходит в Google и возвращается внутри id_token;
 *   несовпадение — вход отклоняется.
 * - **Открытый редирект.** Страница возврата проходит строгий фильтр `sanitizeReturnTo`:
 *   только путь на нашем фронте, без схемы, хоста и обходов.
 * - **Подпись state.** Отдельный ключ, производный от секрета JWT, а не сам секрет:
 *   токен доступа и state не взаимозаменяемы.
 *
 * Кука одноразовая в том смысле, что callback всегда её удаляет: повторный заход по той же ссылке
 * уже без куки не пройдёт.
 */
@Injectable()
export class GoogleOAuthFlowService {
    constructor(
        private readonly google: GoogleOAuthGateway,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    isConfigured(): boolean {
        return this.google.isConfigured();
    }

    sanitizeLocale(locale: string | undefined): string {
        return SOCIAL_LOCALES.includes(locale as (typeof SOCIAL_LOCALES)[number])
            ? (locale as string)
            : DEFAULT_LOCALE;
    }

    /**
     * Начало входа: адрес Google и значение куки, которую надо поставить браузеру.
     * Без этой куки callback не пройдёт.
     */
    buildStart(
        app: SocialApp,
        locale: string | undefined,
        returnTo?: string
    ): { url: string; cookieValue: string } {
        const binding: OAuthBinding = {
            nonce: randomBytes(16).toString("base64url"),
            codeVerifier: randomBytes(32).toString("base64url"),
        };
        const state = this.jwtService.sign(
            {
                purpose: STATE_PURPOSE,
                app,
                locale: this.sanitizeLocale(locale),
                nonce: binding.nonce,
                returnTo: this.sanitizeReturnTo(returnTo, this.sanitizeLocale(locale)),
            } satisfies OAuthState,
            { secret: this.stateSecret(), expiresIn: STATE_TTL }
        );
        const url = this.google.buildAuthUrl({
            redirectUri: this.redirectUri(app),
            state,
            nonce: binding.nonce,
            codeChallenge: createHash("sha256").update(binding.codeVerifier).digest("base64url"),
        });
        return { url, cookieValue: `${binding.nonce}.${binding.codeVerifier}` };
    }

    /**
     * Проверка возврата от Google: state подписан нами, не истёк, относится к этому приложению
     * и принадлежит ТОМУ ЖЕ браузеру, что начал вход (кука).
     */
    verifyCallback(
        app: SocialApp,
        state: string | undefined,
        cookieValue: string | undefined
    ): { locale: string; returnTo?: string; binding: OAuthBinding } {
        if (!state) {
            throw new GoogleFlowError("state_missing");
        }
        let decoded: OAuthState;
        try {
            decoded = this.jwtService.verify<OAuthState>(state, { secret: this.stateSecret() });
        } catch {
            throw new GoogleFlowError("state_invalid");
        }
        if (decoded.purpose !== STATE_PURPOSE || decoded.app !== app || !decoded.nonce) {
            throw new GoogleFlowError("state_invalid");
        }

        const binding = this.parseBinding(cookieValue);
        if (!binding) {
            throw new GoogleFlowError("binding_missing");
        }
        if (!this.sameString(binding.nonce, decoded.nonce)) {
            throw new GoogleFlowError("binding_mismatch");
        }
        const locale = this.sanitizeLocale(decoded.locale);
        return {
            locale,
            returnTo: this.sanitizeReturnTo(decoded.returnTo, locale),
            binding,
        };
    }

    /** Обмен кода на профиль: PKCE-verifier к Google, nonce из id_token — с нашим. */
    async exchangeCode(
        app: SocialApp,
        code: string,
        binding: OAuthBinding
    ): Promise<GoogleProfile> {
        let profile: GoogleProfile;
        try {
            profile = await this.google.exchangeCode({
                code,
                redirectUri: this.redirectUri(app),
                codeVerifier: binding.codeVerifier,
            });
        } catch {
            throw new GoogleFlowError("exchange_failed");
        }
        if (!profile.nonce || !this.sameString(profile.nonce, binding.nonce)) {
            throw new GoogleFlowError("nonce_mismatch");
        }
        return profile;
    }

    /** Куда вернуть пользователя после успешного входа: страница из state или стандартная. */
    successUrl(app: SocialApp, locale: string, returnTo?: string): string {
        return `${this.frontendUrl(app)}${returnTo ?? DEFAULT_LANDING[app](locale)}`;
    }

    /**
     * Путь возврата — единственное, что фронт может попросить. Допускается только относительный
     * путь нашего приложения: одна косая в начале, безопасные символы, без схемы, хоста,
     * обратных косых, `..` и якоря. Всё остальное молча заменяется стандартной страницей.
     * Если локаль в пути не указана, добавляется локаль входа.
     */
    sanitizeReturnTo(raw: string | undefined, locale: string): string | undefined {
        if (!raw || raw.length > 200) return undefined;
        if (!/^\/[A-Za-z0-9\-._~/%]*(\?[A-Za-z0-9\-._~%=&]*)?$/.test(raw)) return undefined;
        if (raw.startsWith("//") || raw.includes("..")) return undefined;

        const path = raw.split("?")[0] ?? raw;
        const hasLocale = SOCIAL_LOCALES.some((l) => path === `/${l}` || path.startsWith(`/${l}/`));
        const withLocale = hasLocale ? raw : `/${locale}${raw === "/" ? "" : raw}`;

        // Возврат на страницы входа создал бы петлю
        const segments = withLocale.split("?")[0]?.split("/").filter(Boolean) ?? [];
        if (segments[1] === "auth") return undefined;
        return withLocale;
    }

    /** Параметры куки привязки: только для маршрутов Google-входа этого приложения. */
    flowCookieOptions(app: SocialApp): CookieOptions {
        return {
            httpOnly: true,
            secure: this.configService.get<string>("AUTH_COOKIE_SECURE") === "true",
            // Возврат от Google — переход верхнего уровня по GET: Lax эту куку пропускает
            sameSite: "lax",
            path: app === "crm" ? "/crm/auth/google" : "/cabinet/auth/google",
            maxAge: FLOW_COOKIE_MAX_AGE_MS,
        };
    }

    frontendUrl(app: SocialApp): string {
        const key = app === "crm" ? "CRM_FRONTEND_URL" : "MEMBER_FRONTEND_URL";
        const fallback = app === "crm" ? "http://localhost:5000" : "http://localhost:5001";
        return (this.configService.get<string>(key) || fallback).replace(/\/+$/, "");
    }

    private parseBinding(cookieValue: string | undefined): OAuthBinding | null {
        if (!cookieValue) return null;
        const [nonce, codeVerifier, extra] = cookieValue.split(".");
        if (!nonce || !codeVerifier || extra !== undefined) return null;
        return { nonce, codeVerifier };
    }

    private sameString(left: string, right: string): boolean {
        const a = Buffer.from(left);
        const b = Buffer.from(right);
        return a.length === b.length && timingSafeEqual(a, b);
    }

    private redirectUri(app: SocialApp): string {
        const base = (
            this.configService.get<string>("API_PUBLIC_URL") || "http://localhost:3000"
        ).replace(/\/+$/, "");
        return app === "crm"
            ? `${base}/crm/auth/google/callback`
            : `${base}/cabinet/auth/google/callback`;
    }

    /** Ключ подписи state выведен из секрета JWT, но не равен ему. */
    private stateSecret(): string {
        return createHmac("sha256", this.configService.getOrThrow<string>(JWT_ENV_KEYS.SECRET))
            .update("google-oauth-state:v1")
            .digest("hex");
    }
}
