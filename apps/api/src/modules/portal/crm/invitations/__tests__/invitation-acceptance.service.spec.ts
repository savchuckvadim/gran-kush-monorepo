import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { AccountOwnershipService } from "@users/application/services/account-ownership.service";
import * as bcrypt from "bcrypt";

import { InvitationAcceptanceService } from "../application/services/invitation-acceptance.service";
import { AcceptInvitationOutcome } from "../domain/invitation-acceptance";

const INVITATION = {
    id: "inv-1",
    portalId: "portal-1",
    email: "invitee@test.local",
    roleId: "role-employee",
    portal: { id: "portal-1", name: "club", displayName: "Club" },
};

const account = (over: Record<string, unknown> = {}) => ({
    id: "user-1",
    email: "invitee@test.local",
    status: "active",
    passwordHash: null as string | null,
    emailConfirmed: true,
    isActive: true,
    ...over,
});

const build = (
    options: { existing?: ReturnType<typeof account> | null; alreadyEmployee?: boolean } = {}
) => {
    const prisma = {
        employee: {
            findFirst: jest
                .fn()
                .mockResolvedValue(options.alreadyEmployee ? { id: "emp-0" } : null),
        },
        employeeInvitation: { update: jest.fn().mockResolvedValue({}) },
    };
    const invitations = { getActiveByToken: jest.fn().mockResolvedValue(INVITATION) };
    const accountProvisioning = {
        ensureUserWithPassword: jest
            .fn()
            .mockResolvedValue({ user: account({ id: "new-user" }), created: true }),
    };
    const employeesService = {
        createFromInvitation: jest.fn().mockResolvedValue({ employee: { id: "emp-1" } }),
    };
    const existing = options.existing === undefined ? null : options.existing;
    const users = {
        findByEmail: jest.fn().mockResolvedValue(existing),
        findById: jest.fn().mockResolvedValue(existing),
    };
    const emailVerification = {
        sendAccountSetup: jest.fn().mockResolvedValue(undefined),
        sendVerificationEmailToUserId: jest.fn().mockResolvedValue(undefined),
    };
    const service = new InvitationAcceptanceService(
        prisma as never,
        invitations as never,
        accountProvisioning as never,
        new AccountOwnershipService(),
        employeesService as never,
        users as never,
        emailVerification as never
    );
    return { service, employeesService, emailVerification };
};

describe("InvitationAcceptanceService — пароль", () => {
    it("новый аккаунт: сотрудник создан, сессии нет до подтверждения почты", async () => {
        const { service, emailVerification } = build();

        const result = await service.acceptWithPassword("tok", { password: "Password1" }, "es");

        expect(result.response.outcome).toBe(AcceptInvitationOutcome.accepted_pending_email);
        expect(result.sessionUserId).toBeUndefined();
        expect(emailVerification.sendVerificationEmailToUserId).toHaveBeenCalledWith("new-user", {
            app: "crm",
            language: "es",
        });
    });

    it("аккаунт без пароля: ссылка задать пароль, приглашение не принято", async () => {
        const { service, employeesService, emailVerification } = build({ existing: account() });

        const result = await service.acceptWithPassword("tok", { password: "Guess1234" }, "es");

        expect(result.response.outcome).toBe(AcceptInvitationOutcome.password_setup_sent);
        expect(emailVerification.sendAccountSetup).toHaveBeenCalled();
        expect(employeesService.createFromInvitation).not.toHaveBeenCalled();
    });

    it("неверный пароль существующего аккаунта — 401", async () => {
        const hash = await bcrypt.hash("Correct123", 4);
        const { service } = build({ existing: account({ passwordHash: hash }) });

        await expect(
            service.acceptWithPassword("tok", { password: "Wrong1234" }, "es")
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("верный пароль, но почта не подтверждена: письмо заново, ни сотрудника, ни сессии", async () => {
        const hash = await bcrypt.hash("Correct123", 4);
        const { service, employeesService, emailVerification } = build({
            existing: account({ passwordHash: hash, emailConfirmed: false, isActive: false }),
        });

        const result = await service.acceptWithPassword("tok", { password: "Correct123" }, "es");

        expect(result.response.outcome).toBe(AcceptInvitationOutcome.confirm_email_first);
        expect(result.sessionUserId).toBeUndefined();
        expect(employeesService.createFromInvitation).not.toHaveBeenCalled();
        expect(emailVerification.sendVerificationEmailToUserId).toHaveBeenCalled();
    });

    it("подтверждённый аккаунт со своим паролем: сотрудник и сессия", async () => {
        const hash = await bcrypt.hash("Correct123", 4);
        const { service } = build({ existing: account({ passwordHash: hash }) });

        const result = await service.acceptWithPassword("tok", { password: "Correct123" }, "es");

        expect(result.response).toEqual({
            outcome: AcceptInvitationOutcome.accepted,
            portalSlug: "club",
            employeeId: "emp-1",
        });
        expect(result.sessionUserId).toBe("user-1");
    });
});

describe("InvitationAcceptanceService — сессия и Google", () => {
    it("сессия приглашённого адреса принимает без пароля", async () => {
        const { service } = build({ existing: account() });

        const result = await service.acceptWithSession("tok", "user-1", undefined);

        expect(result.response.outcome).toBe(AcceptInvitationOutcome.accepted);
        expect(result.sessionUserId).toBe("user-1");
    });

    it("сессия неподтверждённого аккаунта не доказывает владельца — 401", async () => {
        const { service } = build({ existing: account({ emailConfirmed: false }) });

        await expect(service.acceptWithSession("tok", "user-1", undefined)).rejects.toBeInstanceOf(
            UnauthorizedException
        );
    });

    it("сессия другого адреса — 403", async () => {
        const { service, employeesService } = build({
            existing: account({ email: "someone@test.local" }),
        });

        await expect(service.acceptWithSession("tok", "user-1", undefined)).rejects.toBeInstanceOf(
            ForbiddenException
        );
        expect(employeesService.createFromInvitation).not.toHaveBeenCalled();
    });

    it("уже сотрудник клуба — 409, второй записи нет", async () => {
        const { service, employeesService } = build({ existing: account(), alreadyEmployee: true });

        await expect(service.acceptWithSession("tok", "user-1", undefined)).rejects.toBeInstanceOf(
            ConflictException
        );
        expect(employeesService.createFromInvitation).not.toHaveBeenCalled();
    });

    it("адрес из Google без учёта регистра совпадает с адресом приглашения", async () => {
        const { service } = build();

        const result = await service.acceptWithVerifiedAccount("tok", {
            id: "user-1",
            email: "Invitee@Test.Local",
        });

        expect(result.response.outcome).toBe(AcceptInvitationOutcome.accepted);
    });
});
