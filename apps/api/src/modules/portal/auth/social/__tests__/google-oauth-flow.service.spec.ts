import { JwtService } from "@nestjs/jwt";

import { createHash } from "crypto";

import {
    GoogleFlowError,
    GoogleOAuthFlowService,
    OAuthBinding,
} from "../application/services/google-oauth-flow.service";
import { GoogleProfile } from "../domain/social-profile";

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
    const sent: { state?: string; nonce?: string; codeChallenge?: string; verifier?: string } = {};
    const gateway = {
        isConfigured: () => true,
        buildAuthUrl: jest.fn(
            (input: {
                state: string;
                nonce: string;
                codeChallenge: string;
                redirectUri: string;
            }) => {
                sent.state = input.state;
                sent.nonce = input.nonce;
                sent.codeChallenge = input.codeChallenge;
                return `https://accounts.example/auth?state=${input.state}`;
            }
        ),
        exchangeCode: jest.fn(async (input: { codeVerifier: string }) => {
            sent.verifier = input.codeVerifier;
            return profileWith(
                options.exchangeNonce
                    ? options.exchangeNonce(sent.nonce ?? "")
                    : (sent.nonce ?? null)
            );
        }),
    };
    const flow = new GoogleOAuthFlowService(
        gateway as never,
        new JwtService({}),
        config({
            API_PUBLIC_URL: "https://api.test",
            CRM_FRONTEND_URL: "https://crm.test/",
            MEMBER_FRONTEND_URL: "https://club.test",
            AUTH_COOKIE_SECURE: "true",
        }) as never
    );
    return { flow, gateway, sent };
};

describe("GoogleOAuthFlowService — защита входа", () => {
    describe("начало входа", () => {
        it("отправляет Google хеш PKCE-verifier и nonce, а сам verifier оставляет в куке", () => {
            const { flow, sent } = buildFlow();
            const { cookieValue } = flow.buildStart("member", "es");

            const [nonce, verifier] = cookieValue.split(".");
            expect(sent.nonce).toBe(nonce);
            expect(sent.codeChallenge).toBe(
                createHash("sha256").update(verifier).digest("base64url")
            );
            // verifier нигде не попадает в адрес, который видит Google и история браузера
            expect(sent.state).not.toContain(verifier);
        });

        it("каждый вход получает новые nonce и verifier", () => {
            const { flow } = buildFlow();
            expect(flow.buildStart("member", "es").cookieValue).not.toBe(
                flow.buildStart("member", "es").cookieValue
            );
        });

        it("кука привязки: HttpOnly, Lax, только маршруты Google этого приложения", () => {
            const { flow } = buildFlow();
            expect(flow.flowCookieOptions("member")).toMatchObject({
                httpOnly: true,
                sameSite: "lax",
                secure: true,
                path: "/lk/auth/google",
            });
            expect(flow.flowCookieOptions("crm").path).toBe("/crm/auth/google");
        });
    });

    describe("возврат от Google", () => {
        it("тот же браузер: state и кука сходятся", () => {
            const { flow, sent } = buildFlow();
            const { cookieValue } = flow.buildStart("member", "ru", "/ru/join/abc");

            const verified = flow.verifyCallback("member", sent.state, cookieValue);

            expect(verified.locale).toBe("ru");
            expect(verified.returnTo).toBe("/ru/join/abc");
            expect(verified.binding.nonce).toBe(cookieValue.split(".")[0]);
        });

        it("чужой браузер без куки отклоняется — подсунутая жертве ссылка не работает", () => {
            const { flow, sent } = buildFlow();
            flow.buildStart("member", "es");

            expect(() => flow.verifyCallback("member", sent.state, undefined)).toThrow(
                new GoogleFlowError("binding_missing")
            );
        });

        it("кука от другого входа не подходит к этому state", () => {
            const { flow, sent } = buildFlow();
            flow.buildStart("member", "es");
            const firstState = sent.state;
            const other = flow.buildStart("member", "es").cookieValue;

            expect(() => flow.verifyCallback("member", firstState, other)).toThrow(
                new GoogleFlowError("binding_mismatch")
            );
        });

        it("state от другого приложения, испорченный и пустой отклоняются", () => {
            const { flow, sent } = buildFlow();
            const { cookieValue } = flow.buildStart("crm", "es");

            expect(() => flow.verifyCallback("member", sent.state, cookieValue)).toThrow(
                new GoogleFlowError("state_invalid")
            );
            expect(() => flow.verifyCallback("crm", `${sent.state}x`, cookieValue)).toThrow(
                new GoogleFlowError("state_invalid")
            );
            expect(() => flow.verifyCallback("crm", undefined, cookieValue)).toThrow(
                new GoogleFlowError("state_missing")
            );
        });

        it("state, подписанный секретом токенов доступа, не принимается", () => {
            const { flow } = buildFlow();
            const forged = new JwtService({}).sign(
                { purpose: "google_oauth", app: "member", locale: "es", nonce: "n" },
                { secret: SECRET, expiresIn: "10m" }
            );

            expect(() => flow.verifyCallback("member", forged, "n.v")).toThrow(
                new GoogleFlowError("state_invalid")
            );
        });
    });

    describe("обмен кода", () => {
        const binding: OAuthBinding = { nonce: "nonce-1", codeVerifier: "verifier-1" };

        it("передаёт Google verifier, а nonce из id_token должен совпасть", async () => {
            const { flow, gateway } = buildFlow({ exchangeNonce: () => "nonce-1" });

            const profile = await flow.exchangeCode("member", "code", binding);

            expect(profile.email).toBe("owner@test.local");
            expect(gateway.exchangeCode).toHaveBeenCalledWith(
                expect.objectContaining({ code: "code", codeVerifier: "verifier-1" })
            );
        });

        it("чужой nonce в id_token — вход отклоняется", async () => {
            const { flow } = buildFlow({ exchangeNonce: () => "someone-elses" });
            await expect(flow.exchangeCode("member", "code", binding)).rejects.toThrow(
                new GoogleFlowError("nonce_mismatch")
            );
        });

        it("id_token без nonce — вход отклоняется", async () => {
            const { flow } = buildFlow({ exchangeNonce: () => null });
            await expect(flow.exchangeCode("member", "code", binding)).rejects.toThrow(
                new GoogleFlowError("nonce_mismatch")
            );
        });

        it("отказ Google при обмене сводится к exchange_failed", async () => {
            const { flow, gateway } = buildFlow();
            gateway.exchangeCode.mockRejectedValueOnce(new Error("invalid_grant"));
            await expect(flow.exchangeCode("member", "code", binding)).rejects.toThrow(
                new GoogleFlowError("exchange_failed")
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

        it("без названной страницы кабинет ведёт на свою главную", () => {
            expect(flow.successUrl("member", "es")).toBe("https://club.test/es");
            expect(flow.successUrl("crm", "es")).toBe("https://crm.test/es");
            expect(flow.successUrl("member", "es", "/es/join/abc")).toBe(
                "https://club.test/es/join/abc"
            );
        });
    });
});
