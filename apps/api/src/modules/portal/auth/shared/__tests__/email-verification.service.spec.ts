import { UnauthorizedException } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";

import { hashSecretToken } from "@common/crypto/secret-token";

import { EmailVerificationService } from "../application/services/email-verification.service";

type UserRow = {
    id: string;
    email: string;
    displayName: string | null;
    passwordHash: string | null;
    status: UserAccountStatus;
    isActive: boolean;
    emailConfirmed: boolean;
    emailVerificationToken: string | null;
    emailVerificationExpiresAt: Date | null;
    resetPasswordToken: string | null;
    resetPasswordExpiresAt: Date | null;
};

const inHour = () => new Date(Date.now() + 3_600_000);

const user = (overrides: Partial<UserRow> = {}): UserRow => ({
    id: "u1",
    email: "user@test.local",
    displayName: null,
    passwordHash: "hash",
    status: UserAccountStatus.active,
    isActive: true,
    emailConfirmed: false,
    emailVerificationToken: "verify-token",
    emailVerificationExpiresAt: inHour(),
    resetPasswordToken: "reset-token",
    resetPasswordExpiresAt: inHour(),
    ...overrides,
});

const buildService = (row: UserRow | null) => {
    const userRepository = {
        findById: jest.fn().mockResolvedValue(row),
        findByEmail: jest.fn().mockResolvedValue(row),
        findByEmailVerificationToken: jest.fn().mockResolvedValue(row),
        findByResetPasswordToken: jest.fn().mockResolvedValue(row),
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
    const service = new EmailVerificationService(
        userRepository as never,
        mailService as never,
        sessions as never,
        claimedMemberships as never
    );
    return { service, userRepository, mailService, sessions, claimedMemberships };
};

describe("EmailVerificationService — заблокированный аккаунт", () => {
    const blocked = () => user({ status: UserAccountStatus.blocked });

    it("verifyEmail не реанимирует blocked", async () => {
        const { service, userRepository } = buildService(blocked());
        await expect(service.verifyEmail("verify-token")).rejects.toThrow(UnauthorizedException);
        expect(userRepository.update).not.toHaveBeenCalled();
    });

    it("resetPassword не снимает блокировку", async () => {
        const { service, userRepository } = buildService(blocked());
        await expect(service.resetPassword("reset-token", "NewPassword1")).rejects.toThrow(
            UnauthorizedException
        );
        expect(userRepository.update).not.toHaveBeenCalled();
    });

    it("requestPasswordReset отвечает как обычно, но токен не выписывает", async () => {
        const { service, userRepository, mailService } = buildService(blocked());
        const res = await service.requestPasswordReset("user@test.local");
        expect(res.success).toBe(true);
        expect(userRepository.update).not.toHaveBeenCalled();
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
        const { service, userRepository, sessions } = buildService(row);
        const res = await service.resetPassword("reset-token", "NewPassword1");
        expect(res.success).toBe(true);
        expect(userRepository.update).toHaveBeenCalledWith(
            "u1",
            expect.objectContaining({
                status: UserAccountStatus.active,
                emailConfirmed: true,
                isActive: true,
                resetPasswordToken: null,
            })
        );
        expect(sessions.endAllForUser).toHaveBeenCalledWith("u1", "password_reset");
    });

    it("подтверждает членства, ждавшие клейма аккаунта", async () => {
        const row = user({ passwordHash: null, status: UserAccountStatus.pending_claim });
        const { service, claimedMemberships } = buildService(row);
        await service.resetPassword("reset-token", "NewPassword1");
        expect(claimedMemberships.confirmPendingSelfJoins).toHaveBeenCalledWith("u1");
    });

    it("blocked не доезжает до подтверждения членств", async () => {
        const row = user({ status: UserAccountStatus.blocked });
        const { service, claimedMemberships } = buildService(row);
        await expect(service.resetPassword("reset-token", "NewPassword1")).rejects.toThrow(
            UnauthorizedException
        );
        expect(claimedMemberships.confirmPendingSelfJoins).not.toHaveBeenCalled();
    });
});

describe("EmailVerificationService — токены в БД (TASK-668)", () => {
    it("хранит только хеш токена сброса, в письмо уходит сам токен", async () => {
        const { service, userRepository, mailService } = buildService(user());
        await service.requestPasswordReset("user@test.local");

        const [, , mailed] = mailService.sendPasswordReset.mock.calls[0] as [
            unknown,
            unknown,
            string,
        ];
        const [, { resetPasswordToken: stored }] = userRepository.update.mock.calls[0] as [
            string,
            { resetPasswordToken: string },
        ];
        expect(stored).toBe(hashSecretToken(mailed));
        expect(stored).not.toBe(mailed);
    });

    it("ищет ссылку по хешу", async () => {
        const { service, userRepository } = buildService(user());
        await service.resetPassword("reset-token", "NewPassword1");
        await service.verifyEmail("verify-token");

        expect(userRepository.findByResetPasswordToken).toHaveBeenCalledWith(
            hashSecretToken("reset-token")
        );
        expect(userRepository.findByEmailVerificationToken).toHaveBeenCalledWith(
            hashSecretToken("verify-token")
        );
    });
});
