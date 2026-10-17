import { UserAccountStatus } from "@prisma/client";

import { IdentityAccountsService } from "../application/services/identity-accounts.service";
import { LinkIdentityUseCase } from "../application/use-cases/link-identity.use-case";
import { SignInWithIdentityUseCase } from "../application/use-cases/sign-in-with-identity.use-case";
import { IdentityError } from "../domain/identity-error";
import type { ExternalProfile } from "../domain/identity-provider";

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

const google = (overrides: Partial<ExternalProfile> = {}): ExternalProfile => ({
    provider: "google",
    subject: "google-sub-1",
    email: "owner@test.local",
    emailVerified: true,
    displayName: "Owner",
    givenName: "Own",
    familyName: "Er",
    username: null,
    locale: "es",
    ...overrides,
});

const telegram = (): ExternalProfile => ({
    provider: "telegram",
    subject: "42",
    email: null,
    emailVerified: false,
    displayName: "Ana",
    givenName: "Ana",
    familyName: null,
    username: "ana",
    locale: null,
});

const build = (options: {
    byEmail?: UserRow | null;
    linkedUserId?: string | null;
    byId?: UserRow | null;
    current?: { providerUserId: string } | null;
}) => {
    const updated: Record<string, unknown>[] = [];
    const users = {
        findById: jest.fn().mockResolvedValue(options.byId ?? null),
        findByEmail: jest.fn().mockResolvedValue(options.byEmail ?? null),
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
        findForUser: jest.fn().mockResolvedValue(options.current ?? null),
        link: jest.fn().mockResolvedValue(undefined),
    };
    const sessions = { endAllForUser: jest.fn().mockResolvedValue(0) };
    const authTokens = { revokeForUser: jest.fn().mockResolvedValue(undefined) };
    const tickets = { issue: jest.fn().mockReturnValue("ticket-1") };
    const accounts = new IdentityAccountsService(
        users as never,
        identities as never,
        sessions as never,
        authTokens as never
    );
    const signIn = new SignInWithIdentityUseCase(accounts, tickets as never);
    const link = new LinkIdentityUseCase(users as never, identities as never);
    return { accounts, signIn, link, users, identities, sessions, tickets, updated };
};

describe("SignInWithIdentityUseCase — вход через провайдера", () => {
    it("новый адрес, подтверждённый провайдером — активный аккаунт без пароля и привязка", async () => {
        const { signIn, users, identities } = build({});
        const result = await signIn.execute("cabinet", google());
        expect(users.create).toHaveBeenCalledWith(
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
        expect(result).toMatchObject({ kind: "signed_in", user: { id: "new-user" } });
    });

    it("неподтверждённый адрес провайдера ничего не заводит — шаг почты", async () => {
        const { signIn, users, tickets } = build({});
        const result = await signIn.execute("cabinet", google({ emailVerified: false }));
        expect(result).toEqual({ kind: "email_required", ticket: "ticket-1" });
        expect(users.create).not.toHaveBeenCalled();
        expect(tickets.issue).toHaveBeenCalledWith("cabinet", expect.anything());
    });

    it("Telegram без привязки — шаг почты, аккаунт по имени не ищется", async () => {
        const { signIn, users } = build({});
        const result = await signIn.execute("crm", telegram());
        expect(result.kind).toBe("email_required");
        expect(users.findByEmail).not.toHaveBeenCalled();
    });

    it("привязанный способ входит в свой аккаунт без поиска по адресу", async () => {
        const linked = user({ id: "linked-user", email: "old-mail@test.local" });
        const { signIn, users } = build({ linkedUserId: "linked-user", byId: linked });
        const result = await signIn.execute("cabinet", google());
        expect(result).toMatchObject({ kind: "signed_in", user: { id: "linked-user" } });
        expect(users.findByEmail).not.toHaveBeenCalled();
    });

    it("blocked не входит ни по привязке, ни по адресу", async () => {
        const blocked = user({ status: UserAccountStatus.blocked });
        await expect(
            build({ linkedUserId: "u1", byId: blocked }).signIn.execute("cabinet", telegram())
        ).rejects.toThrow(new IdentityError("account_blocked"));
        await expect(
            build({ byEmail: blocked }).signIn.execute("cabinet", google())
        ).rejects.toThrow(new IdentityError("account_blocked"));
    });
});

describe("IdentityAccountsService — заявка аккаунта", () => {
    it("подтверждённый аккаунт — просто привязка, без сброса пароля и сессий", async () => {
        const { accounts, identities, sessions, updated } = build({ byEmail: user() });
        await accounts.findOrCreateByVerifiedEmail(google());
        expect(updated).toHaveLength(0);
        expect(sessions.endAllForUser).not.toHaveBeenCalled();
        expect(identities.link).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" }));
    });

    it("pending_claim клеймится: активация и отзыв сессий", async () => {
        const { accounts, sessions, updated } = build({
            byEmail: user({
                status: UserAccountStatus.pending_claim,
                passwordHash: null,
                isActive: false,
                emailConfirmed: false,
            }),
        });
        await accounts.findOrCreateByVerifiedEmail(google());
        expect(updated[0]).toMatchObject({
            status: UserAccountStatus.active,
            isActive: true,
            emailConfirmed: true,
        });
        expect(sessions.endAllForUser).toHaveBeenCalledWith("u1", "account_claimed");
    });

    it("пароль неподтверждённого аккаунта сбрасывается при клейме (TASK-664)", async () => {
        const { accounts, updated } = build({
            byEmail: user({ emailConfirmed: false, passwordHash: "impostor-hash" }),
        });
        await accounts.findOrCreateByVerifiedEmail(google());
        expect(updated[0]).toMatchObject({ passwordHash: null });
    });

    it("в привязке — подтверждение адреса, имя и язык из профиля", async () => {
        const { accounts, identities } = build({ byEmail: user() });
        await accounts.findOrCreateByVerifiedEmail(google());
        expect(identities.link).toHaveBeenCalledWith(
            expect.objectContaining({
                provider: "google",
                providerUserId: "google-sub-1",
                emailVerified: true,
                givenName: "Own",
                familyName: "Er",
                locale: "es",
            })
        );
    });
});

describe("LinkIdentityUseCase — привязка к вошедшему аккаунту", () => {
    it("чужой способ не перепривязывается", async () => {
        const { link } = build({ byId: user(), linkedUserId: "someone-else" });
        await expect(link.execute("u1", google())).rejects.toThrow(
            new IdentityError("taken", "google")
        );
    });

    it("второй способ того же провайдера — только после отвязки первого", async () => {
        const { link } = build({ byId: user(), current: { providerUserId: "other-sub" } });
        await expect(link.execute("u1", google())).rejects.toThrow(
            new IdentityError("other_linked", "google")
        );
    });

    it("адрес, который провайдер не подтвердил, не привязывается", async () => {
        const { link, identities } = build({ byId: user() });
        await expect(link.execute("u1", google({ emailVerified: false }))).rejects.toThrow(
            new IdentityError("unverified", "google")
        );
        expect(identities.link).not.toHaveBeenCalled();
    });

    it("Telegram без почты привязывается; повтор того же — без ошибки", async () => {
        const { link, identities } = build({ byId: user(), current: { providerUserId: "42" } });
        await link.execute("u1", telegram());
        expect(identities.link).toHaveBeenCalledWith(
            expect.objectContaining({ provider: "telegram", providerUserId: "42", username: "ana" })
        );
    });

    it("пропавший или заблокированный аккаунт — account_gone", async () => {
        await expect(build({}).link.execute("u1", telegram())).rejects.toThrow(
            new IdentityError("account_gone")
        );
    });
});
