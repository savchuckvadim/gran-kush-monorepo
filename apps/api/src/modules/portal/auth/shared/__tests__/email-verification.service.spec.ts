import { UnauthorizedException } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";

import { hashSecretToken } from "@common/crypto/secret-token";
import { AuthTokensService } from "@modules/portal/auth/tokens/application/auth-tokens.service";
import { AUTH_TOKEN_PURPOSES } from "@modules/portal/auth/tokens/domain/auth-token";
import { InMemoryAuthTokenRepository } from "@modules/portal/auth/tokens/__tests__/in-memory-auth-token.repository";

import { EmailVerificationService } from "../application/services/email-verification.service";

type UserRow = {
    id: string;
    email: string;
    displayName: string | null;
    passwordHash: string | null;
    status: UserAccountStatus;
    isActive: boolean;
    emailConfirmed: boolean;
};

const user = (overrides: Partial<UserRow> = {}): UserRow => ({
    id: "u1",
    email: "user@test.local",
    displayName: null,
    passwordHash: "hash",
    status: UserAccountStatus.active,
    isActive: true,
    emailConfirmed: false,
    ...overrides,
});

const buildService = (row: UserRow | null) => {
    const userRepository = {
        findById: jest.fn().mockResolvedValue(row),
        findByEmail: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue(row),
    };
    const mailService = {
        sendMemberEmailVerification: jest.fn(),
        sendEmployeeEmailVerification: jest.fn(),
        sendPasswordReset: jest.fn(),
        sendAccountSetup: jest.fn(),
    };
    const sessions = { endAllForUser: jest.fn().mockResolvedValue(0) };
    const claimedMemberships = { confirmPendingSelfJoins: jest.fn().mockResolvedValue(0) };
    const links = new InMemoryAuthTokenRepository();
    const authTokens = new AuthTokensService(links);
    const service = new EmailVerificationService(
        userRepository as never,
        mailService as never,
        sessions as never,
        claimedMemberships as never,
        authTokens
    );
    /** Живая ссылка аккаунта `u1` — как из письма */
    const link = async (purpose: (typeof AUTH_TOKEN_PURPOSES)[keyof typeof AUTH_TOKEN_PURPOSES]) =>
        (await authTokens.issue(purpose, { userId: "u1" })).token;
    return { service, userRepository, mailService, sessions, claimedMemberships, links, link };
};

const { EmailVerification, PasswordReset, AccountSetup } = AUTH_TOKEN_PURPOSES;

describe("EmailVerificationService — заблокированный аккаунт", () => {
    const blocked = () => user({ status: UserAccountStatus.blocked });

    it("verifyEmail не реанимирует blocked", async () => {
        const { service, userRepository, link } = buildService(blocked());
        await expect(service.verifyEmail(await link(EmailVerification))).rejects.toThrow(
            UnauthorizedException
        );
        expect(userRepository.update).not.toHaveBeenCalled();
    });

    it("resetPassword не снимает блокировку", async () => {
        const { service, userRepository, link } = buildService(blocked());
        await expect(
            service.resetPassword(await link(PasswordReset), "NewPassword1")
        ).rejects.toThrow(UnauthorizedException);
        expect(userRepository.update).not.toHaveBeenCalled();
    });

    it("requestPasswordReset отвечает как обычно, но токен не выписывает", async () => {
        const { service, links, mailService } = buildService(blocked());
        const res = await service.requestPasswordReset("user@test.local");
        expect(res.success).toBe(true);
        expect(links.rows).toHaveLength(0);
        expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it("sendAccountSetup молчит для blocked", async () => {
        const { service, mailService } = buildService(
            user({ status: UserAccountStatus.blocked, passwordHash: null })
        );
        await service.sendAccountSetup("user@test.local", { app: "member" });
        expect(mailService.sendAccountSetup).not.toHaveBeenCalled();
    });

    it("письмо подтверждения blocked не уходит", async () => {
        const { service, mailService } = buildService(blocked());
        await service.sendVerificationEmailToUserId("u1");
        expect(mailService.sendMemberEmailVerification).not.toHaveBeenCalled();
    });
});

describe("EmailVerificationService — публичный resend", () => {
    it("неизвестный email — тишина без ошибки", async () => {
        const { service, mailService } = buildService(null);
        await service.resendConfirmationByEmail("ghost@test.local", { app: "member" });
        expect(mailService.sendMemberEmailVerification).not.toHaveBeenCalled();
    });

    it("неподтверждённому уходит письмо нужного приложения", async () => {
        const { service, mailService } = buildService(user());
        await service.resendConfirmationByEmail("user@test.local", { app: "crm", language: "es" });
        expect(mailService.sendEmployeeEmailVerification).toHaveBeenCalledTimes(1);
        expect(mailService.sendMemberEmailVerification).not.toHaveBeenCalled();
    });

    it("подтверждённому ничего не шлём", async () => {
        const { service, mailService } = buildService(user({ emailConfirmed: true }));
        await service.resendConfirmationByEmail("user@test.local", { app: "member" });
        expect(mailService.sendMemberEmailVerification).not.toHaveBeenCalled();
    });
});

describe("EmailVerificationService — resetPassword клеймит аккаунт", () => {
    it("ставит пароль, подтверждает email и выкидывает старые сессии", async () => {
        const row = user({ passwordHash: null, status: UserAccountStatus.pending_claim });
        const { service, userRepository, sessions, link } = buildService(row);
        const res = await service.resetPassword(await link(AccountSetup), "NewPassword1");
        expect(res.success).toBe(true);
        expect(userRepository.update).toHaveBeenCalledWith(
            "u1",
            expect.objectContaining({
                status: UserAccountStatus.active,
                emailConfirmed: true,
                isActive: true,
            })
        );
        expect(sessions.endAllForUser).toHaveBeenCalledWith("u1", "password_reset");
    });

    it("подтверждает членства, ждавшие клейма аккаунта", async () => {
        const row = user({ passwordHash: null, status: UserAccountStatus.pending_claim });
        const { service, claimedMemberships, link } = buildService(row);
        await service.resetPassword(await link(AccountSetup), "NewPassword1");
        expect(claimedMemberships.confirmPendingSelfJoins).toHaveBeenCalledWith("u1");
    });

    it("blocked не доезжает до подтверждения членств", async () => {
        const row = user({ status: UserAccountStatus.blocked });
        const { service, claimedMemberships, link } = buildService(row);
        await expect(
            service.resetPassword(await link(PasswordReset), "NewPassword1")
        ).rejects.toThrow(UnauthorizedException);
        expect(claimedMemberships.confirmPendingSelfJoins).not.toHaveBeenCalled();
    });
});

describe("EmailVerificationService — ссылки из писем (TASK-668, TASK-736)", () => {
    it("хранит только хеш токена сброса, в письмо уходит сам токен", async () => {
        const { service, links, mailService } = buildService(user());
        await service.requestPasswordReset("user@test.local");

        const [, , mailed] = mailService.sendPasswordReset.mock.calls[0] as [
            unknown,
            unknown,
            string,
        ];
        expect(links.rows[0]?.tokenHash).toBe(hashSecretToken(mailed));
        expect(links.rows[0]?.tokenHash).not.toBe(mailed);
    });

    it("ссылка сброса работает один раз", async () => {
        const { service, link } = buildService(user());
        const token = await link(PasswordReset);
        await service.resetPassword(token, "NewPassword1");
        await expect(service.resetPassword(token, "Another12345")).rejects.toThrow(
            "Invalid reset token"
        );
    });

    it("ссылка подтверждения почты не подходит для сброса пароля", async () => {
        const { service, link } = buildService(user());
        await expect(
            service.resetPassword(await link(EmailVerification), "NewPassword1")
        ).rejects.toThrow("Invalid reset token");
    });

    it("новый пароль гасит прочие ссылки аккаунта", async () => {
        const { service, link, links } = buildService(user());
        await link(EmailVerification);
        await service.resetPassword(await link(PasswordReset), "NewPassword1");
        expect(links.rows.filter((row) => !row.consumedAt)).toHaveLength(0);
    });
});
