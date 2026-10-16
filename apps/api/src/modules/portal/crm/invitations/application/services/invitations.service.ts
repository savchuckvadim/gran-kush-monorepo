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
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { randomBytes } from "crypto";

import { PrismaService } from "@common/prisma/prisma.service";
import { PORTAL_SUMMARY_SELECT } from "@modules/portal/crm/portals/infrastructure/prisma-includes/portal-summary.select";

import { CreateInvitationDto, PublicInvitationInfoDto } from "../../api/dto/invitation.dto";
import { InvitationAccountState } from "../../domain/invitation-acceptance";

const INVITATION_TTL_DAYS = 7;

export type InvitationWithPortal = EmployeeInvitation & {
    portal: { id: string; name: string; displayName: string };
};

/** Приглашения сотрудников: выдача, список, отзыв и чтение по токену. Приём — `InvitationAcceptanceService`. */
@Injectable()
export class InvitationsService {
    private readonly logger = new Logger(InvitationsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly ownership: AccountOwnershipService,
        private readonly userRepository: UserRepository,
        private readonly mailService: MailService
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

    /** Что показать на странице приглашения: клуб, роль и как принимающий может доказать адрес. */
    async getPublicInfo(token: string): Promise<PublicInvitationInfoDto> {
        const invitation = await this.getActiveByToken(token);
        const user = await this.userRepository.findByEmail(invitation.email);
        const accountState = !user
            ? InvitationAccountState.new
            : this.ownership.hasPassword(user)
              ? InvitationAccountState.password
              : InvitationAccountState.passwordless;
        return {
            email: invitation.email,
            role: invitation.role,
            portalSlug: invitation.portal.name,
            portalDisplayName: invitation.portal.displayName,
            accountState,
        };
    }
}
