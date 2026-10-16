import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import { MailService } from "@mail/application/services/mail.service";
import type { SupportedLanguage } from "@mail/consts/mail.constants";
import { EmployeeInvitation, InvitationStatus } from "@prisma/client";
import { AccountOwnershipService } from "@users/application/services/account-ownership.service";
import { AccountProvisioningService } from "@users/application/services/account-provisioning.service";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { randomBytes } from "crypto";

import { PrismaService } from "@common/prisma/prisma.service";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { EmployeesService } from "@modules/portal/crm/employees/application/services/employees.service";
import { PORTAL_SUMMARY_SELECT } from "@modules/portal/crm/portals/infrastructure/prisma-includes/portal-summary.select";

import { AcceptInvitationResponseDto, CreateInvitationDto } from "../../api/dto/invitation.dto";

const INVITATION_TTL_DAYS = 7;

/** Токены не попадают в тело ответа: контроллер кладёт их в HttpOnly-куки CRM. */
export interface AcceptInvitationResult {
    response: AcceptInvitationResponseDto;
    tokens?: { accessToken: string; refreshToken: string };
}

type InvitationWithPortal = EmployeeInvitation & {
    portal: { id: string; name: string; displayName: string };
};

@Injectable()
export class InvitationsService {
    private readonly logger = new Logger(InvitationsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly accountProvisioning: AccountProvisioningService,
        private readonly ownership: AccountOwnershipService,
        private readonly employeesService: EmployeesService,
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly userRepository: UserRepository,
        private readonly mailService: MailService,
        private readonly emailVerification: EmailVerificationService
    ) {}

    async create(
        dto: CreateInvitationDto,
        portalId: string,
        invitedByEmployeeId: string,
        language: SupportedLanguage
    ): Promise<EmployeeInvitation> {
        const existingEmployee = await this.prisma.employee.findFirst({
            where: { portalId, user: { email: dto.email.toLowerCase() } },
            select: { id: true },
        });
        if (existingEmployee) {
            throw new ConflictException("User is already an employee of this portal");
        }

        const pending = await this.prisma.employeeInvitation.findFirst({
            where: {
                portalId,
                email: dto.email.toLowerCase(),
                status: InvitationStatus.pending,
                expiresAt: { gt: new Date() },
            },
        });
        if (pending) {
            throw new ConflictException("Active invitation for this email already exists");
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

        const invitation = await this.prisma.employeeInvitation.create({
            data: {
                portalId,
                email: dto.email.toLowerCase(),
                role: dto.role,
                token: randomBytes(24).toString("hex"),
                invitedByEmployeeId,
                expiresAt,
            },
            include: { portal: { select: PORTAL_SUMMARY_SELECT } },
        });

        // Приглашение уже создано, ссылку админ видит в ответе: сбой очереди писем его не отменяет
        try {
            await this.mailService.sendEmployeeInvitation({
                to: invitation.email,
                token: invitation.token,
                portalName: invitation.portal.displayName,
                language,
            });
        } catch (error: unknown) {
            this.logger.error(
                `Invitation email ${invitation.id} was not queued`,
                error instanceof Error ? error.stack : String(error)
            );
        }

        return invitation;
    }

    async listByPortal(portalId: string): Promise<EmployeeInvitation[]> {
        return this.prisma.employeeInvitation.findMany({
            where: { portalId },
            orderBy: { createdAt: "desc" },
        });
    }

    async revoke(id: string, portalId: string): Promise<void> {
        const invitation = await this.prisma.employeeInvitation.findFirst({
            where: { id, portalId },
        });
        if (!invitation) {
            throw new NotFoundException("Invitation not found");
        }
        if (invitation.status !== InvitationStatus.pending) {
            throw new BadRequestException("Only pending invitations can be revoked");
        }
        await this.prisma.employeeInvitation.update({
            where: { id },
            data: { status: InvitationStatus.revoked },
        });
    }

    async getActiveByToken(token: string): Promise<InvitationWithPortal> {
        const invitation = await this.prisma.employeeInvitation.findUnique({
            where: { token },
            include: { portal: { select: PORTAL_SUMMARY_SELECT } },
        });
        if (!invitation || invitation.status !== InvitationStatus.pending) {
            throw new NotFoundException("Invitation not found or no longer active");
        }
        if (invitation.expiresAt < new Date()) {
            await this.prisma.employeeInvitation.update({
                where: { id: invitation.id },
                data: { status: InvitationStatus.expired },
            });
            throw new NotFoundException("Invitation has expired");
        }
        return invitation;
    }

    async accept(
        token: string,
        dto: { password?: string; fields?: Record<string, unknown> },
        language: SupportedLanguage,
        deviceId: string
    ): Promise<AcceptInvitationResult> {
        const invitation = await this.getActiveByToken(token);

        // Токен знает и админ, который выдал приглашение, поэтому для аккаунта с паролем
        // принимающий доказывает, что аккаунт его, самим паролем — иначе приглашение на чужой email
        // выдавало бы токены этого аккаунта (security-audit, TASK-662)
        const existing = await this.userRepository.findByEmail(invitation.email);
        if (existing && this.ownership.proofMethod(existing) === "password") {
            await this.ownership.assertOwnerProof(existing, {
                kind: "password",
                password: dto.password,
            });
        } else if (existing) {
            // Аккаунт без пароля (pending_claim или только Google) мог завести другой клуб, в нём
            // могут лежать документы. Токен видел админ, поэтому пароль здесь не ставится:
            // владелец задаёт его по ссылке из письма и принимает приглашение уже с паролем
            // (TASK-664). Принять сессией или Google — TASK-707
            await this.emailVerification.sendAccountSetup(invitation.email, {
                app: "crm",
                language,
                portalName: invitation.portal.displayName,
            });
            throw new ConflictException(
                "This email already has an account without a password. We sent a link to set it; then open the invitation again"
            );
        }

        // Новый аккаунт: ссылку видел и админ, поэтому владение адресом доказывает только
        // подтверждение почты — до него сессии нет (TASK-664)
        const { user, created } = await this.accountProvisioning.ensureUserWithPassword(
            invitation.email,
            dto.password,
            { emailVerified: false }
        );

        const { employee } = await this.employeesService.create(
            {
                email: invitation.email,
                role: invitation.role,
                fields: dto.fields ?? {},
                invitationId: invitation.id,
            },
            invitation.portalId
        );

        await this.prisma.employeeInvitation.update({
            where: { id: invitation.id },
            data: {
                status: InvitationStatus.accepted,
                acceptedAt: new Date(),
                acceptedUserId: user.id,
            },
        });

        const base = {
            employeeId: employee.employee.id,
            userId: user.id,
            portalSlug: invitation.portal.name,
        };

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
            return { response: { ...base, awaitingEmailConfirmation: true } };
        }

        const tokens = await this.employeeAuthService.generateTokens(
            { id: user.id, email: user.email },
            deviceId
        );

        return {
            response: { ...base, awaitingEmailConfirmation: false },
            tokens,
        };
    }
}
