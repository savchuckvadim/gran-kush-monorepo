import { UnauthorizedException } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";

import {
    AccountOwnershipService,
    OwnerSubject,
} from "../application/services/account-ownership.service";

const subject = (overrides: Partial<OwnerSubject> = {}): OwnerSubject => ({
    id: "u1",
    status: UserAccountStatus.active,
    passwordHash: null,
    emailConfirmed: true,
    isActive: true,
    ...overrides,
});

describe("AccountOwnershipService", () => {
    const service = new AccountOwnershipService();

    describe("isClaimed / proofMethod", () => {
        it("pending_claim — владельца ещё нет", () => {
            expect(service.isClaimed(subject({ status: UserAccountStatus.pending_claim }))).toBe(
                false
            );
        });

        it("аккаунт только с Google заявлен, хотя пароля у него нет", () => {
            const googleOnly = subject({ passwordHash: null });
            expect(service.isClaimed(googleOnly)).toBe(true);
            expect(service.hasPassword(googleOnly)).toBe(false);
            expect(service.proofMethod(googleOnly)).toBe("mailbox");
        });

        it("с паролем доказывают паролем", () => {
            expect(service.proofMethod(subject({ passwordHash: "hash" }))).toBe("password");
        });
    });

    describe("assertOwnerProof", () => {
        it("верный пароль проходит, неверный и пустой — 401", async () => {
            const passwordHash = await bcrypt.hash("Secret123", 4);
            const user = subject({ passwordHash });
            await expect(
                service.assertOwnerProof(user, { kind: "password", password: "Secret123" })
            ).resolves.toBeUndefined();
            await expect(
                service.assertOwnerProof(user, { kind: "password", password: "wrong" })
            ).rejects.toThrow(UnauthorizedException);
            await expect(
                service.assertOwnerProof(user, { kind: "password", password: undefined })
            ).rejects.toThrow(UnauthorizedException);
        });

        it("пароль не подходит аккаунту, у которого его нет", async () => {
            await expect(
                service.assertOwnerProof(subject(), { kind: "password", password: "anything" })
            ).rejects.toThrow(UnauthorizedException);
        });

        it("сессия другого аккаунта и неподтверждённая почта — 401", async () => {
            await expect(
                service.assertOwnerProof(subject(), { kind: "session", userId: "u1" })
            ).resolves.toBeUndefined();
            await expect(
                service.assertOwnerProof(subject(), { kind: "session", userId: "other" })
            ).rejects.toThrow(UnauthorizedException);
            await expect(
                service.assertOwnerProof(subject({ emailConfirmed: false }), {
                    kind: "session",
                    userId: "u1",
                })
            ).rejects.toThrow(UnauthorizedException);
        });

        it("токен из письма достаточен только аккаунту без пароля", async () => {
            await expect(
                service.assertOwnerProof(subject(), { kind: "mailbox_token" })
            ).resolves.toBeUndefined();
            await expect(
                service.assertOwnerProof(subject({ passwordHash: "hash" }), {
                    kind: "mailbox_token",
                })
            ).rejects.toThrow(UnauthorizedException);
        });

        it("заблокированный аккаунт не доказывает ничего", async () => {
            await expect(
                service.assertOwnerProof(subject({ status: UserAccountStatus.blocked }), {
                    kind: "mailbox_token",
                })
            ).rejects.toThrow(UnauthorizedException);
        });
    });
});
