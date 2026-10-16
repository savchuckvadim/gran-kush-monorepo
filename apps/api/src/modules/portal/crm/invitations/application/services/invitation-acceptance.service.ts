import {
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import type { SupportedLanguage } from "@mail/consts/mail.constants";
import { InvitationStatus } from "@prisma/client";
import { AccountOwnershipService } from "@users/application/services/account-ownership.service";
import { AccountProvisioningService } from "@users/application/services/account-provisioning.service";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { EmployeesService } from "@modules/portal/crm/employees/application/services/employees.service";

import { AcceptInvitationResponseDto } from "../../api/dto/invitation.dto";
import { AcceptInvitationOutcome } from "../../domain/invitation-acceptance";

import { InvitationsService, type InvitationWithPortal } from "./invitations.service";

/** Токены не попадают в тело ответа: контроллер кладёт их в HttpOnly-куки CRM. */
export interface AcceptInvitationResult {
    response: AcceptInvitationResponseDto;
    tokens?: { accessToken: string; refreshToken: string };
}

/** Аккаунт, владелец которого уже доказан: паролем, подтверждённой сессией или Google. */
type ProvenAccount = Pick<User, "id" | "email">;

/**
 * Приём приглашения сотрудника.
 *
 * Токен приглашения знает и админ, который его выдал, поэтому токен сам по себе ничего не
 * доказывает (TASK-662). Сотрудник появляется только у аккаунта, владелец которого доказан:
 *
 * - паролем аккаунта на публичной странице;
 * - открытой сессией этого аккаунта — в CRM или в кабинете (почта подтверждена при входе);
 * - Google: подтверждённый Google-ом адрес равен адресу приглашения.
 *
 * Во всех случаях адрес аккаунта должен совпасть с адресом приглашения. Новый аккаунт
 * заводится с паролем из формы, но сессию получает только после подтверждения почты (TASK-664).
 */
@Injectable()
export class InvitationAcceptanceService {
    private readonly logger = new Logger(InvitationAcceptanceService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly invitations: InvitationsService,
        private readonly accountProvisioning: AccountProvisioningService,
        private readonly ownership: AccountOwnershipService,
        private readonly employeesService: EmployeesService,
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly userRepository: UserRepository,
        private readonly emailVerification: EmailVerificationService
    ) {}

    /** Публичная форма: новый аккаунт задаёт пароль, существующий доказывает себя своим. */
    async acceptWithPassword(
        token: string,
        dto: { password?: string; fields?: Record<string, unknown> },
        language: SupportedLanguage,
        deviceId: string
    ): Promise<AcceptInvitationResult> {
        const invitation = await this.invitations.getActiveByToken(token);
        const portalSlug = invitation.portal.name;
        const existing = await this.userRepository.findByEmail(invitation.email);

        if (!existing) {
            return this.acceptAsNewAccount(invitation, dto, language);
        }
        if (!this.ownership.hasPassword(existing)) {
            // Пароль здесь не ставится: ссылку видел админ. Владелец задаёт его по письму
            // и возвращается к приглашению (или принимает его сессией или Google)
            await this.emailVerification.sendAccountSetup(invitation.email, {
                app: "crm",
                language,
                portalName: invitation.portal.displayName,
            });
            return {
                response: { outcome: AcceptInvitationOutcome.password_setup_sent, portalSlug },
            };
        }

        await this.ownership.assertOwnerProof(existing, {
            kind: "password",
            password: dto.password,
        });
        if (!existing.emailConfirmed || !existing.isActive) {
            // Пароль неподтверждённого аккаунта мог задать не владелец адреса: ни сотрудника,
            // ни сессии, пока почта не подтверждена
            await this.emailVerification.sendVerificationEmailToUserId(existing.id, {
                app: "crm",
                language,
            });
            return {
                response: { outcome: AcceptInvitationOutcome.confirm_email_first, portalSlug },
            };
        }
        return this.complete(invitation, existing, dto.fields, deviceId);
    }

    /** Открытая сессия приглашённого аккаунта (CRM или кабинет): сама сессия и есть доказательство. */
    async acceptWithSession(
        token: string,
        userId: string,
        fields: Record<string, unknown> | undefined,
        deviceId: string
    ): Promise<AcceptInvitationResult> {
        const invitation = await this.invitations.getActiveByToken(token);
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException("Account not found");
        }
        await this.ownership.assertOwnerProof(user, { kind: "session", userId });
        return this.complete(invitation, user, fields, deviceId);
    }

    /** Google подтвердил адрес: аккаунт для него только что найден или заведён. */
    async acceptWithVerifiedAccount(
        token: string,
        account: ProvenAccount,
        deviceId: string
    ): Promise<AcceptInvitationResult> {
        const invitation = await this.invitations.getActiveByToken(token);
        return this.complete(invitation, account, undefined, deviceId);
    }

    private async acceptAsNewAccount(
        invitation: InvitationWithPortal,
        dto: { password?: string; fields?: Record<string, unknown> },
        language: SupportedLanguage
    ): Promise<AcceptInvitationResult> {
        const { user, created } = await this.accountProvisioning.ensureUserWithPassword(
            invitation.email,
            dto.password,
            { emailVerified: false }
        );
        const employeeId = await this.createEmployee(invitation, user.id, dto.fields);

        if (created) {
            try {
                await this.emailVerification.sendVerificationEmailToUserId(user.id, {
                    app: "crm",
                    language,
                });
            } catch (error: unknown) {
                // Сотрудник уже создан; письмо можно запросить повторно с экрана входа
                this.logger.error(
                    `Verification email for invited user ${user.id} was not queued`,
                    error instanceof Error ? error.stack : String(error)
                );
            }
        }
        return {
            response: {
                outcome: AcceptInvitationOutcome.accepted_pending_email,
                portalSlug: invitation.portal.name,
                employeeId,
            },
        };
    }

    /** Владелец доказан: сотрудник, отметка о приёме и сессия CRM. */
    private async complete(
        invitation: InvitationWithPortal,
        account: ProvenAccount,
        fields: Record<string, unknown> | undefined,
        deviceId: string
    ): Promise<AcceptInvitationResult> {
        if (account.email.trim().toLowerCase() !== invitation.email) {
            throw new ForbiddenException("This invitation was sent to another email address");
        }
        const employeeId = await this.createEmployee(invitation, account.id, fields);
        const tokens = await this.employeeAuthService.generateTokens(
            { id: account.id, email: account.email },
            deviceId
        );
        return {
            response: {
                outcome: AcceptInvitationOutcome.accepted,
                portalSlug: invitation.portal.name,
                employeeId,
            },
            tokens,
        };
    }

    private async createEmployee(
        invitation: InvitationWithPortal,
        userId: string,
        fields: Record<string, unknown> | undefined
    ): Promise<string> {
        const existing = await this.prisma.employee.findFirst({
            where: { userId, portalId: invitation.portalId },
            select: { id: true },
        });
        if (existing) {
            throw new ConflictException("User is already an employee of this portal");
        }

        const { employee } = await this.employeesService.create(
            {
                email: invitation.email,
                role: invitation.role,
                fields: fields ?? {},
                invitationId: invitation.id,
            },
            invitation.portalId
        );
        await this.prisma.employeeInvitation.update({
            where: { id: invitation.id },
            data: {
                status: InvitationStatus.accepted,
                acceptedAt: new Date(),
                acceptedUserId: userId,
            },
        });
        return employee.employee.id;
    }
}
