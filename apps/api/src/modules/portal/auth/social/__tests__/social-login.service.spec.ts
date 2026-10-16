import { UnauthorizedException } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";

import { SocialLoginService } from "../application/services/social-login.service";
import { GoogleProfile } from "../domain/social-profile";

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
    email: "owner@test.local",
    displayName: null,
    passwordHash: "hash",
    status: UserAccountStatus.active,
    isActive: true,
    emailConfirmed: true,
    ...overrides,
});

const profile = (overrides: Partial<GoogleProfile> = {}): GoogleProfile => ({
    providerUserId: "google-sub-1",
    email: "owner@test.local",
    emailVerified: true,
    displayName: "Owner",
    givenName: "Own",
    familyName: "Er",
    locale: "es",
    nonce: null,
    ...overrides,
});

const buildService = (options: {
    byEmail?: UserRow | null;
    linkedUserId?: string | null;
    byId?: UserRow | null;
    employees?: { isActive: boolean }[];
}) => {
    const updated: Record<string, unknown>[] = [];
    const userRepository = {
        findById: jest.fn().mockResolvedValue(options.byId ?? null),
        findByEmail: jest.fn().mockResolvedValue(options.byEmail ?? null),
        findByEmailWithMemberships: jest.fn().mockResolvedValue(
            options.byEmail || options.byId
                ? {
                      ...(options.byId ?? options.byEmail),
                      employees: options.employees ?? [],
                  }
                : null
        ),
        create: jest
            .fn()
            .mockImplementation((data: Record<string, unknown>) =>
                Promise.resolve({ ...user({ passwordHash: null }), ...data, id: "new-user" })
            ),
        update: jest.fn().mockImplementation((id: string, data: Record<string, unknown>) => {
            updated.push(data);
            const base = options.byId ?? options.byEmail ?? user();
            return Promise.resolve({ ...base, ...data, id });
        }),
    };
    const identities = {
        findUserIdByProvider: jest.fn().mockResolvedValue(options.linkedUserId ?? null),
        link: jest.fn().mockResolvedValue(undefined),
    };
    const refreshTokens = { revokeAllForUser: jest.fn().mockResolvedValue(0) };
    const service = new SocialLoginService(
        userRepository as never,
        identities as never,
        refreshTokens as never
    );
    return { service, userRepository, identities, refreshTokens, updated };
};

describe("SocialLoginService — вход участника через Google", () => {
    it("новый email — создаёт активный аккаунт без пароля и привязывает identity", async () => {
        const { service, userRepository, identities } = buildService({});
        const result = await service.loginMemberWithGoogle(profile());
        expect(userRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: "owner@test.local",
                passwordHash: null,
                isActive: true,
                emailConfirmed: true,
            })
        );
        expect(identities.link).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "new-user", provider: "google" })
        );
        expect(result.id).toBe("new-user");
    });

    it("непроверенный Google-email отклоняется", async () => {
        const { service, userRepository } = buildService({});
        await expect(
            service.loginMemberWithGoogle(profile({ emailVerified: false }))
        ).rejects.toThrow(UnauthorizedException);
        expect(userRepository.create).not.toHaveBeenCalled();
    });

    it("blocked не входит", async () => {
        const { service } = buildService({
            byEmail: user({ status: UserAccountStatus.blocked }),
        });
        await expect(service.loginMemberWithGoogle(profile())).rejects.toThrow(
            UnauthorizedException
        );
    });

    it("подтверждённый аккаунт — просто привязка, без сброса пароля и сессий", async () => {
        const { service, identities, refreshTokens, updated } = buildService({
            byEmail: user(),
        });
        await service.loginMemberWithGoogle(profile());
        expect(updated).toHaveLength(0);
        expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled();
        expect(identities.link).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" }));
    });

    it("pending_claim клеймится: активация и отзыв сессий, членства сами не подтверждаются", async () => {
        const { service, refreshTokens, updated } = buildService({
            byEmail: user({
                status: UserAccountStatus.pending_claim,
                passwordHash: null,
                isActive: false,
                emailConfirmed: false,
            }),
        });
        await service.loginMemberWithGoogle(profile());
        expect(updated[0]).toMatchObject({
            status: UserAccountStatus.active,
            isActive: true,
            emailConfirmed: true,
        });
        expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith("u1");
    });

    it("в identity сохраняются подтверждение email, имя и язык из профиля Google", async () => {
        const { service, identities } = buildService({ byEmail: user() });
        await service.loginMemberWithGoogle(profile());
        expect(identities.link).toHaveBeenCalledWith(
            expect.objectContaining({
                provider: "google",
                emailVerified: true,
                givenName: "Own",
                familyName: "Er",
                locale: "es",
            })
        );
    });

    it("пароль неподтверждённого аккаунта сбрасывается при клейме (TASK-664)", async () => {
        const { service, updated } = buildService({
            byEmail: user({ emailConfirmed: false, passwordHash: "impostor-hash" }),
        });
        await service.loginMemberWithGoogle(profile());
        expect(updated[0]).toMatchObject({ passwordHash: null });
    });

    it("возврат по ранее привязанной identity находит аккаунт без поиска по email", async () => {
        const linked = user({ id: "linked-user", email: "old-mail@test.local" });
        const { service, userRepository } = buildService({
            linkedUserId: "linked-user",
            byId: linked,
        });
        const result = await service.loginMemberWithGoogle(profile());
        expect(result.id).toBe("linked-user");
        expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });
});

describe("SocialLoginService — вход сотрудника через Google", () => {
    it("аккаунта нет — заводится подтверждённый аккаунт без клубов", async () => {
        const { service, userRepository } = buildService({});
        const result = await service.loginEmployeeWithGoogle(profile());
        expect(userRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ email: "owner@test.local", emailConfirmed: true })
        );
        expect(result.hasClubs).toBe(false);
    });

    it("аккаунт без активных трудоустройств — входит без клубов", async () => {
        const { service } = buildService({ byEmail: user(), employees: [{ isActive: false }] });
        const result = await service.loginEmployeeWithGoogle(profile());
        expect(result.hasClubs).toBe(false);
    });

    it("владелец клуба входит с клубами", async () => {
        const { service } = buildService({ byEmail: user(), employees: [{ isActive: true }] });
        const result = await service.loginEmployeeWithGoogle(profile());
        expect(result.hasClubs).toBe(true);
    });
});
