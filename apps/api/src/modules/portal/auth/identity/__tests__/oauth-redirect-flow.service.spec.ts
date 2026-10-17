import { JwtService } from "@nestjs/jwt";

import { createHash } from "crypto";

import { PublicUrlsService } from "@common/config/public-urls/public-urls.service";

import { OAuthRedirectFlowService } from "../application/services/oauth-redirect-flow.service";
import {
    type OAuthBinding,
    OAuthFlowError,
} from "../application/services/oauth-redirect-flow.types";
import type { GoogleProfile } from "../domain/google-profile";
import { IdentityError } from "../domain/identity-error";
import { GoogleIdentityProvider } from "../infrastructure/google/google.identity-provider";

const SECRET = "jwt-secret-for-tests";

const config = (values: Record<string, string> = {}) => ({
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
        if (key === "JWT_SECRET") return SECRET;
        const value = values[key];
        if (value === undefined) throw new Error(`missing ${key}`);
        return value;
    },
});

const profileWith = (nonce: string | null): GoogleProfile => ({
    providerUserId: "sub-1",
    email: "owner@test.local",
    emailVerified: true,
    displayName: "Owner",
    givenName: "Own",
    familyName: "Er",
    locale: "es",
    nonce,
});

/** Двойник Google: запоминает, что ему отправили, и отдаёт профиль с заданным nonce. */
const buildFlow = (options: { exchangeNonce?: (sent: string) => string | null } = {}) => {
    const sent: { state?: string; nonce?: string; codeChallenge?: string; redirectUri?: string } =
        {};
    const gateway = {
        isConfigured: () => true,
        buildAuthUrl: jest.fn(
            (input: {
                state: string;
                nonce: string;
                codeChallenge: string;
                redirectUri: string;
            }) => {
                Object.assign(sent, input);
                return `https://accounts.example/auth?state=${input.state}`;
            }
        ),
        exchangeCode: jest.fn(async (_input: { codeVerifier: string }) =>
            profileWith(
                options.exchangeNonce
                    ? options.exchangeNonce(sent.nonce ?? "")
                    : (sent.nonce ?? null)
            )
        ),
    };
    const settings = config({
        API_PUBLIC_URL: "https://api.test",
        CRM_FRONTEND_URL: "https://crm.test/",
        MEMBER_FRONTEND_URL: "https://club.test",
        AUTH_COOKIE_SECURE: "true",
    });
    const flow = new OAuthRedirectFlowService(
        new JwtService({}),
        settings as never,
        new PublicUrlsService(settings as never)
    );
    const google = new GoogleIdentityProvider(gateway as never);
    return { flow, google, gateway, sent };
};

describe("OAuthRedirectFlowService — защита входа", () => {
    describe("начало входа", () => {
        it("отправляет провайдеру хеш PKCE-verifier и nonce, а сам verifier оставляет в куке", () => {
            const { flow, google, sent } = buildFlow();
            const { cookieValue } = flow.start(google, "cabinet", { locale: "es" });

            const [nonce, verifier] = cookieValue.split(".");
            expect(sent.nonce).toBe(nonce);
            expect(sent.codeChallenge).toBe(
                createHash("sha256")
                    .update(verifier ?? "")
                    .digest("base64url")
            );
            expect(sent.redirectUri).toBe("https://api.test/cabinet/auth/google/callback");
            // verifier нигде не попадает в адрес, который видит провайдер и история браузера
            expect(sent.state).not.toContain(verifier);
        });

        it("каждый вход получает новые nonce и verifier", () => {
            const { flow, google } = buildFlow();
            expect(flow.start(google, "cabinet", {}).cookieValue).not.toBe(
                flow.start(google, "cabinet", {}).cookieValue
            );
        });

        it("кука привязки: HttpOnly, Lax, только маршруты этого провайдера в этом приложении", () => {
            const { flow } = buildFlow();
            expect(flow.flowCookieOptions("cabinet", "google")).toMatchObject({
                httpOnly: true,
                sameSite: "lax",
                secure: true,
                path: "/cabinet/auth/google",
            });
            expect(flow.flowCookieOptions("crm", "google").path).toBe("/crm/auth/google");
        });
    });

    describe("возврат от провайдера", () => {
        it("тот же браузер: state и кука сходятся", () => {
            const { flow, google, sent } = buildFlow();
            const { cookieValue } = flow.start(google, "cabinet", {
                locale: "ru",
                returnTo: "/ru/join/abc",
            });

            const verified = flow.verifyCallback("cabinet", "google", sent.state, cookieValue);

            expect(verified.locale).toBe("ru");
            expect(verified.returnTo).toBe("/ru/join/abc");
            expect(verified.binding.nonce).toBe(cookieValue.split(".")[0]);
        });

        it("чужой браузер без куки отклоняется — подсунутая жертве ссылка не работает", () => {
            const { flow, google, sent } = buildFlow();
            flow.start(google, "cabinet", {});

            expect(() => flow.verifyCallback("cabinet", "google", sent.state, undefined)).toThrow(
                new OAuthFlowError("binding_missing")
            );
        });

        it("кука от другого входа не подходит к этому state", () => {
            const { flow, google, sent } = buildFlow();
            flow.start(google, "cabinet", {});
            const firstState = sent.state;
            const other = flow.start(google, "cabinet", {}).cookieValue;

            expect(() => flow.verifyCallback("cabinet", "google", firstState, other)).toThrow(
                new OAuthFlowError("binding_mismatch")
            );
        });

        it("state другого приложения или провайдера, испорченный и пустой отклоняются", () => {
            const { flow, google, sent } = buildFlow();
            const { cookieValue } = flow.start(google, "crm", {});

            expect(() => flow.verifyCallback("cabinet", "google", sent.state, cookieValue)).toThrow(
                new OAuthFlowError("state_invalid")
            );
            expect(() => flow.verifyCallback("crm", "telegram", sent.state, cookieValue)).toThrow(
                new OAuthFlowError("state_invalid")
            );
            expect(() =>
                flow.verifyCallback("crm", "google", `${sent.state ?? ""}x`, cookieValue)
            ).toThrow(new OAuthFlowError("state_invalid"));
            expect(() => flow.verifyCallback("crm", "google", undefined, cookieValue)).toThrow(
                new OAuthFlowError("state_missing")
            );
        });

        it("state, подписанный секретом токенов доступа, не принимается", () => {
            const { flow } = buildFlow();
            const forged = new JwtService({}).sign(
                {
                    purpose: "oauth_redirect",
                    audience: "cabinet",
                    provider: "google",
                    locale: "es",
                    nonce: "n",
                },
                { secret: SECRET, expiresIn: "10m" }
            );

            expect(() => flow.verifyCallback("cabinet", "google", forged, "n.v")).toThrow(
                new OAuthFlowError("state_invalid")
            );
        });

        it("намерение из state проходит фильтр: привязка — только к UUID аккаунта", () => {
            const { flow, google, sent } = buildFlow();
            const userId = "7d3f1c1e-5b8a-4f7e-9a7e-0f2b6a1c9d11";
            const { cookieValue } = flow.start(google, "cabinet", {
                intent: { kind: "link", userId },
            });
            expect(
                flow.verifyCallback("cabinet", "google", sent.state, cookieValue).intent
            ).toEqual({ kind: "link", userId });

            const bad = flow.start(google, "cabinet", {
                intent: { kind: "link", userId: "../admin" },
            });
            expect(
                flow.verifyCallback("cabinet", "google", sent.state, bad.cookieValue).intent
            ).toBeUndefined();
        });
    });

    describe("обмен кода", () => {
        const binding: OAuthBinding = { nonce: "nonce-1", codeVerifier: "verifier-1" };

        it("передаёт провайдеру verifier, а nonce из id_token должен совпасть", async () => {
            const { flow, google, gateway } = buildFlow({ exchangeNonce: () => "nonce-1" });

            const profile = await flow.exchange(google, "cabinet", "code", binding);

            expect(profile).toMatchObject({
                provider: "google",
                subject: "sub-1",
                email: "owner@test.local",
                emailVerified: true,
            });
            expect(gateway.exchangeCode).toHaveBeenCalledWith(
                expect.objectContaining({ code: "code", codeVerifier: "verifier-1" })
            );
        });

        it("чужой nonce в id_token — вход отклоняется", async () => {
            const { flow, google } = buildFlow({ exchangeNonce: () => "someone-elses" });
            await expect(flow.exchange(google, "cabinet", "code", binding)).rejects.toThrow(
                new IdentityError("signature", "google")
            );
        });

        it("id_token без nonce — вход отклоняется", async () => {
            const { flow, google } = buildFlow({ exchangeNonce: () => null });
            await expect(flow.exchange(google, "cabinet", "code", binding)).rejects.toThrow(
                new IdentityError("signature", "google")
            );
        });

        it("отказ провайдера при обмене сводится к signature", async () => {
            const { flow, google, gateway } = buildFlow();
            gateway.exchangeCode.mockRejectedValueOnce(new Error("invalid_grant"));
            await expect(flow.exchange(google, "cabinet", "code", binding)).rejects.toThrow(
                new IdentityError("signature", "google")
            );
        });
    });

    describe("страница возврата", () => {
        const { flow } = buildFlow();

        it.each([
            ["/es/join/abc123", "es", "/es/join/abc123"],
            ["/join/abc123", "ru", "/ru/join/abc123"],
            ["/en/consent/tok?x=1", "es", "/en/consent/tok?x=1"],
            ["/", "es", "/es"],
        ])("%s принимается как %s", (raw, locale, expected) => {
            expect(flow.sanitizeReturnTo(raw, locale)).toBe(expected);
        });

        it.each([
            "https://evil.example/x",
            "//evil.example/x",
            "/\\evil.example",
            "javascript:alert(1)",
            "/es/../admin",
            "/es/join#frag",
            "/es/auth/login",
            "/es/join/<script>",
            `/${"a".repeat(250)}`,
            "evil",
            "",
        ])("%j отклоняется", (raw) => {
            expect(flow.sanitizeReturnTo(raw, "es")).toBeUndefined();
        });

        it("без названной страницы приложение ведёт на свою главную", () => {
            expect(flow.successUrl("cabinet", "es")).toBe("https://club.test/es");
            expect(flow.successUrl("crm", "es")).toBe("https://crm.test/es");
            expect(flow.successUrl("cabinet", "es", "/es/join/abc")).toBe(
                "https://club.test/es/join/abc"
            );
        });
    });
});
