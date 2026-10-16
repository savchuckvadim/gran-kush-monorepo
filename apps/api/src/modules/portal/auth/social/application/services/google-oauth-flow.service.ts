import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { CookieOptions } from "express";

import { PublicUrlsService } from "@common/config/public-urls/public-urls.service";
import { JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";
import { GoogleOAuthGateway } from "@modules/portal/auth/social/domain/google-oauth.gateway";
import { GoogleProfile } from "@modules/portal/auth/social/domain/social-profile";

import {
    CALLBACK_PATH,
    DEFAULT_LANDING,
    DEFAULT_LOCALE,
    FLOW_COOKIE_MAX_AGE_MS,
    FLOW_COOKIE_PATH,
    GoogleFlowError,
    type GoogleIntent,
    INVITATION_TOKEN,
    type OAuthBinding,
    type OAuthState,
    SOCIAL_LOCALES,
    type SocialApp,
    STATE_PURPOSE,
    STATE_TTL,
} from "./google-oauth-flow.types";

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
        private readonly configService: ConfigService,
        private readonly urls: PublicUrlsService
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
        returnTo?: string,
        intent?: GoogleIntent
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
                intent: this.sanitizeIntent(intent),
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
    ): { locale: string; returnTo?: string; intent?: GoogleIntent; binding: OAuthBinding } {
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
            intent: this.sanitizeIntent(decoded.intent),
            binding,
        };
    }

    /** Намерение из запроса старта: известный вид и токен правильной формы, иначе — обычный вход. */
    parseIntent(kind: string | undefined, token: string | undefined): GoogleIntent | undefined {
        if (kind === "invitation" && token) return this.sanitizeIntent({ kind, token });
        if (kind === "club_signup") return { kind };
        return undefined;
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
            path: FLOW_COOKIE_PATH[app],
            maxAge: FLOW_COOKIE_MAX_AGE_MS,
        };
    }

    frontendUrl(app: SocialApp): string {
        return app === "crm" ? this.urls.crm : this.urls.cabinet;
    }

    private sanitizeIntent(intent: GoogleIntent | undefined): GoogleIntent | undefined {
        if (!intent) return undefined;
        if (intent.kind === "club_signup") return { kind: "club_signup" };
        if (intent.kind === "invitation" && INVITATION_TOKEN.test(intent.token)) {
            return { kind: "invitation", token: intent.token };
        }
        return undefined;
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
        return `${this.urls.api}${CALLBACK_PATH[app]}`;
    }

    /** Ключ подписи state выведен из секрета JWT, но не равен ему. */
    private stateSecret(): string {
        return createHmac("sha256", this.configService.getOrThrow<string>(JWT_ENV_KEYS.SECRET))
            .update("google-oauth-state:v1")
            .digest("hex");
    }
}
