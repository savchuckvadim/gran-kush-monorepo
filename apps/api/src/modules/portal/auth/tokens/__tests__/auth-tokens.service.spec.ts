import { hashSecretToken } from "@common/crypto/secret-token";

import { AuthTokensService } from "../application/auth-tokens.service";
import { AUTH_TOKEN_PURPOSES } from "../domain/auth-token";

import { InMemoryAuthTokenRepository } from "./in-memory-auth-token.repository";

const { EmailVerification, PasswordReset, AccountSetup, IdentityEmailLink } = AUTH_TOKEN_PURPOSES;

const build = () => {
    const repository = new InMemoryAuthTokenRepository();
    return { repository, service: new AuthTokensService(repository) };
};

describe("AuthTokensService — одноразовые ссылки из писем (TASK-736)", () => {
    it("в БД только хеш, в письмо — сам токен", async () => {
        const { service, repository } = build();
        const { token } = await service.issue(PasswordReset, { userId: "u1" });

        expect(repository.rows).toHaveLength(1);
        expect(repository.rows[0]?.tokenHash).toBe(hashSecretToken(token));
        expect(repository.rows[0]?.tokenHash).not.toBe(token);
    });

    it("ссылка работает один раз", async () => {
        const { service } = build();
        const { token } = await service.issue(EmailVerification, { userId: "u1" });

        const first = await service.consume(EmailVerification, token);
        expect(first).toEqual({
            kind: "consumed",
            token: { purpose: EmailVerification, userId: "u1", email: null, payload: null },
        });
        expect(await service.consume(EmailVerification, token)).toEqual({ kind: "invalid" });
    });

    it("новое письмо гасит прежнюю ссылку того же назначения, другие — нет", async () => {
        const { service } = build();
        const old = await service.issue(PasswordReset, { userId: "u1" });
        const setup = await service.issue(AccountSetup, { userId: "u1" });
        const fresh = await service.issue(PasswordReset, { userId: "u1" });

        expect(await service.consume(PasswordReset, old.token)).toEqual({ kind: "invalid" });
        expect((await service.consume(PasswordReset, fresh.token)).kind).toBe("consumed");
        expect((await service.consume(AccountSetup, setup.token)).kind).toBe("consumed");
    });

    it("ссылка другого назначения не подходит", async () => {
        const { service } = build();
        const { token } = await service.issue(EmailVerification, { userId: "u1" });

        expect(await service.consume(PasswordReset, token)).toEqual({ kind: "invalid" });
        expect((await service.consume([PasswordReset, EmailVerification], token)).kind).toBe(
            "consumed"
        );
    });

    it("истёкшая ссылка — expired и не гасится", async () => {
        const { service, repository } = build();
        const { token } = await service.issue(PasswordReset, { userId: "u1" });
        const row = repository.rows[0];
        if (row) row.expiresAt = new Date(Date.now() - 1_000);

        expect(await service.consume(PasswordReset, token)).toEqual({ kind: "expired" });
        expect(row?.consumedAt).toBeNull();
    });

    it("ссылка на адрес без аккаунта несёт адрес и данные шага", async () => {
        const { service } = build();
        const payload = { provider: "telegram", profile: { telegramId: "42" } };
        const { token } = await service.issue(
            IdentityEmailLink,
            { email: "a@test.local" },
            payload
        );

        expect(await service.consume(IdentityEmailLink, token)).toEqual({
            kind: "consumed",
            token: { purpose: IdentityEmailLink, userId: null, email: "a@test.local", payload },
        });
    });

    it("revokeForUser гасит только названные назначения этого аккаунта", async () => {
        const { service } = build();
        const reset = await service.issue(PasswordReset, { userId: "u1" });
        const verify = await service.issue(EmailVerification, { userId: "u1" });
        const other = await service.issue(PasswordReset, { userId: "u2" });

        await service.revokeForUser("u1", [PasswordReset]);

        expect(await service.consume(PasswordReset, reset.token)).toEqual({ kind: "invalid" });
        expect((await service.consume(EmailVerification, verify.token)).kind).toBe("consumed");
        expect((await service.consume(PasswordReset, other.token)).kind).toBe("consumed");
    });
});
