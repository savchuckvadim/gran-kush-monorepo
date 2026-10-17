import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { CookieOptions } from "express";

import { PublicUrlsService } from "@common/config/public-urls/public-urls.service";
import { JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";
import { isAuthCookieSecure } from "@modules/portal/auth/sessions/api/auth-cookie-security";
import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";

import { IdentityError } from "../../domain/identity-error";
import { type IdentityIntent, sanitizeIntent } from "../../domain/identity-intent";
import type {
    ExternalProfile,
    IdentityProviderKey,
    RedirectIdentityProvider,
} from "../../domain/identity-provider";

import {
    DEFAULT_LOCALE,
    FLOW_COOKIE_MAX_AGE_MS,
    FLOW_LOCALES,
    type OAuthBinding,
    OAuthFlowError,
    type OAuthState,
    STATE_PURPOSE,
    STATE_TTL,
    type VerifiedCallback,
} from "./oauth-redirect-flow.types";

const RETURN_TO_MAX_LENGTH = 200;
const SAFE_RETURN_TO = /^\/[A-Za-z0-9\-._~/%]*(\?[A-Za-z0-9\-._~%=&]*)?$/;

/**
 * OAuth-редирект любого провайдера и всё, что его защищает.
 *
 * - **Подмена входа (login CSRF).** Атакующий начинает вход, получает ссылку возврата со СВОИМ
 *   кодом и подсовывает её жертве. Защита: `state` подписан сервером и несёт nonce, тот же nonce
 *   лежит в HttpOnly-куке браузера, начавшего вход. Чужой браузер куки не имеет — callback отклонён.
 * - **Перехват кода.** Без `code_verifier` код бесполезен (PKCE, S256); verifier живёт только в куке.
 * - **Подмена id_token.** Тот же nonce уходит провайдеру и сверяется адаптером в ответе.
 * - **Открытый редирект.** Страница возврата проходит `sanitizeReturnTo`: только путь нашего фронта.
 * - **Чужой state.** State привязан к аудитории и провайдеру и подписан ключом, производным от
 *   секрета JWT: токен доступа и state не взаимозаменяемы.
 *
 * Кука удаляется в callback при любом исходе: повторный заход по той же ссылке не пройдёт.
 */
@Injectable()
export class OAuthRedirectFlowService {
    private readonly secureCookie: boolean;

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly urls: PublicUrlsService
    ) {
        this.secureCookie = isAuthCookieSecure(configService);
    }

    sanitizeLocale(locale: string | undefined): string {
        return FLOW_LOCALES.includes(locale as (typeof FLOW_LOCALES)[number])
            ? (locale as string)
            : DEFAULT_LOCALE;
    }

    /** Начало входа: адрес провайдера и значение куки, без которой callback не пройдёт. */
    start(
        provider: RedirectIdentityProvider,
        audience: SessionAudience,
        input: { locale?: string; returnTo?: string; intent?: IdentityIntent }
    ): { url: string; cookieValue: string } {
        const locale = this.sanitizeLocale(input.locale);
        const binding: OAuthBinding = {
            nonce: randomBytes(16).toString("base64url"),
            codeVerifier: randomBytes(32).toString("base64url"),
        };
        const state = this.jwtService.sign(
            {
                purpose: STATE_PURPOSE,
                audience,
                provider: provider.key,
                locale,
                nonce: binding.nonce,
                returnTo: this.sanitizeReturnTo(input.returnTo, locale),
                intent: sanitizeIntent(input.intent),
            } satisfies OAuthState,
            { secret: this.stateSecret(), expiresIn: STATE_TTL }
        );
        const url = provider.authorizationUrl({
            redirectUri: this.redirectUri(audience, provider.key),
            state,
            nonce: binding.nonce,
            codeChallenge: createHash("sha256").update(binding.codeVerifier).digest("base64url"),
        });
        return { url, cookieValue: `${binding.nonce}.${binding.codeVerifier}` };
    }

    /**
     * Возврат от провайдера: state подписан нами, не истёк, выписан этой аудитории и этому
     * провайдеру и принадлежит ТОМУ ЖЕ браузеру, что начал вход (кука).
     */
    verifyCallback(
        audience: SessionAudience,
        provider: IdentityProviderKey,
        state: string | undefined,
        cookieValue: string | undefined
    ): VerifiedCallback {
        if (!state) throw new OAuthFlowError("state_missing");
        let decoded: OAuthState;
        try {
            decoded = this.jwtService.verify<OAuthState>(state, { secret: this.stateSecret() });
        } catch {
            throw new OAuthFlowError("state_invalid");
        }
        if (
            decoded.purpose !== STATE_PURPOSE ||
            decoded.audience !== audience ||
            decoded.provider !== provider ||
            !decoded.nonce
        ) {
            throw new OAuthFlowError("state_invalid");
        }

        const binding = this.parseBinding(cookieValue);
        if (!binding) throw new OAuthFlowError("binding_missing");
        if (!this.sameString(binding.nonce, decoded.nonce)) {
            throw new OAuthFlowError("binding_mismatch");
        }
        const locale = this.sanitizeLocale(decoded.locale);
        return {
            locale,
            returnTo: this.sanitizeReturnTo(decoded.returnTo, locale),
            intent: sanitizeIntent(decoded.intent),
            binding,
        };
    }

    /** Обмен кода: verifier PKCE к провайдеру, nonce сверяет адаптер. */
    async exchange(
        provider: RedirectIdentityProvider,
        audience: SessionAudience,
        code: string,
        binding: OAuthBinding
    ): Promise<ExternalProfile> {
        try {
            return await provider.exchange({
                code,
                redirectUri: this.redirectUri(audience, provider.key),
                codeVerifier: binding.codeVerifier,
                nonce: binding.nonce,
            });
        } catch (error: unknown) {
            if (error instanceof IdentityError) throw error;
            throw new IdentityError("signature", provider.key);
        }
    }

    /** Куда вернуть после входа: страница из state или главная приложения. */
    successUrl(audience: SessionAudience, locale: string, returnTo?: string): string {
        return `${this.frontendUrl(audience)}${returnTo ?? `/${locale}`}`;
    }

    frontendUrl(audience: SessionAudience): string {
        return audience === "crm" ? this.urls.crm : this.urls.cabinet;
    }

    /**
     * Путь возврата — единственное, что фронт может попросить: относительный путь нашего
     * приложения с одной косой в начале, без схемы, хоста, `..` и якоря. Остальное молча
     * заменяется главной. Без локали в начале добавляется локаль входа; страницы входа
     * отбрасываются — иначе петля.
     */
    sanitizeReturnTo(raw: string | undefined, locale: string): string | undefined {
        if (!raw || raw.length > RETURN_TO_MAX_LENGTH || !SAFE_RETURN_TO.test(raw)) {
            return undefined;
        }
        if (raw.startsWith("//") || raw.includes("..")) return undefined;

        const path = raw.split("?")[0] ?? raw;
        const hasLocale = FLOW_LOCALES.some((l) => path === `/${l}` || path.startsWith(`/${l}/`));
        const withLocale = hasLocale ? raw : `/${locale}${raw === "/" ? "" : raw}`;

        const segments = withLocale.split("?")[0]?.split("/").filter(Boolean) ?? [];
        if (segments[1] === "auth") return undefined;
        return withLocale;
    }

    /** Кука привязки живёт только на маршрутах этого провайдера в этой аудитории. */
    flowCookieOptions(audience: SessionAudience, provider: IdentityProviderKey): CookieOptions {
        return {
            httpOnly: true,
            secure: this.secureCookie,
            // Возврат от провайдера — переход верхнего уровня по GET: Lax эту куку пропускает
            sameSite: "lax",
            path: `/${audience}/auth/${provider}`,
            maxAge: FLOW_COOKIE_MAX_AGE_MS,
        };
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

    /** Куда провайдер возвращает браузер; эти адреса прописаны у провайдера (Google Cloud). */
    private redirectUri(audience: SessionAudience, provider: IdentityProviderKey): string {
        return `${this.urls.api}/${audience}/auth/${provider}/callback`;
    }

    private stateSecret(): string {
        return createHmac("sha256", this.configService.getOrThrow<string>(JWT_ENV_KEYS.SECRET))
            .update("oauth-redirect-state:v1")
            .digest("hex");
    }
}
