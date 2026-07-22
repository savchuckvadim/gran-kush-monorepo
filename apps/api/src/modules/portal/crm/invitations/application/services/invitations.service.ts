import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { EmployeeInvitation, InvitationStatus } from "@prisma/client";
import { AccountProvisioningService } from "@users/application/services/account-provisioning.service";
import { randomBytes, randomUUID } from "crypto";

import { PrismaService } from "@common/prisma/prisma.service";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { EmployeesService } from "@modules/portal/crm/employees/application/services/employees.service";

import { AcceptInvitationResponseDto, CreateInvitationDto } from "../../api/dto/invitation.dto";
import { PORTAL_SUMMARY_SELECT } from "@modules/portal/crm/portals/infrastructure/prisma-includes/portal-summary.select";

const INVITATION_TTL_DAYS = 7;

type InvitationWithPortal = EmployeeInvitation & {
    portal: { id: string; name: string; displayName: string };
};

@Injectable()
export class InvitationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly accountProvisioning: AccountProvisioningService,
        private readonly employeesService: EmployeesService,
        private readonly employeeAuthService: EmployeeAuthService
    ) {}

    async create(
        dto: CreateInvitationDto,
        portalId: string,
        invitedByEmployeeId: string
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

        return this.prisma.employeeInvitation.create({
            data: {
                portalId,
                email: dto.email.toLowerCase(),
                role: dto.role,
                token: randomBytes(24).toString("hex"),
                invitedByEmployeeId,
                expiresAt,
            },
        });
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
        dto: { password?: string; fields?: Record<string, unknown> }
    ): Promise<AcceptInvitationResponseDto> {
        const invitation = await this.getActiveByToken(token);

        // Ссылка-приглашение пришла на email → владение адресом подтверждено
        const { user } = await this.accountProvisioning.ensureUserWithPassword(
            invitation.email,
            dto.password,
            { emailVerified: true }
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

        const tokens = await this.employeeAuthService.generateTokens(
            { id: user.id, email: user.email },
            randomUUID()
        );

        return {
            employeeId: employee.employee.id,
            userId: user.id,
            portalSlug: invitation.portal.name,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }
}
