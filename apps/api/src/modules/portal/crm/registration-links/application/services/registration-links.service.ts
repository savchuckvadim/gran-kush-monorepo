import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import {
    FormPurpose,
    MemberJoinSource,
    RegistrationLink,
    RegistrationLinkKind,
} from "@prisma/client";
import { AccountProvisioningService } from "@users/application/services/account-provisioning.service";
import { randomBytes } from "crypto";

import { PrismaService } from "@common/prisma/prisma.service";
import { FormSchemaService } from "@modules/portal/crm/entity-fields/application/services/form-schema.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import { JoinPortalService } from "@modules/portal/crm/members/application/services/join-portal.service";

import { PORTAL_SUMMARY_SELECT } from "@modules/portal/crm/portals/infrastructure/prisma-includes/portal-summary.select";

import {
    CreateRegistrationLinkDto,
    RegisterViaLinkDto,
    RegisterViaLinkResponseDto,
    UpdateRegistrationLinkDto,
} from "../../api/dto/registration-link.dto";

type LinkWithPortal = RegistrationLink & {
    portal: { id: string; name: string; displayName: string };
};

@Injectable()
export class RegistrationLinksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly accountProvisioning: AccountProvisioningService,
        private readonly joinPortalService: JoinPortalService,
        private readonly formSchemaService: FormSchemaService
    ) {}

    async create(
        dto: CreateRegistrationLinkDto,
        portalId: string,
        createdByEmployeeId: string
    ): Promise<RegistrationLink> {
        const memberDef = await this.prisma.entityDefinition.findUnique({
            where: { portalId_code: { portalId, code: ENTITY_DEFINITION_CODES.MEMBER } },
            select: { id: true },
        });
        if (!memberDef) {
            throw new BadRequestException("Portal member entity is not configured");
        }
        return this.prisma.registrationLink.create({
            data: {
                portalId,
                entityDefinitionId: memberDef.id,
                token: randomBytes(24).toString("hex"),
                name: dto.name,
                kind: dto.kind ?? RegistrationLinkKind.public_link,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                maxUses: dto.maxUses ?? null,
                createdByEmployeeId,
            },
        });
    }

    async listByPortal(portalId: string): Promise<RegistrationLink[]> {
        return this.prisma.registrationLink.findMany({
            where: { portalId },
            orderBy: { createdAt: "desc" },
        });
    }

    async update(
        id: string,
        portalId: string,
        dto: UpdateRegistrationLinkDto
    ): Promise<RegistrationLink> {
        const link = await this.prisma.registrationLink.findFirst({ where: { id, portalId } });
        if (!link) {
            throw new NotFoundException("Registration link not found");
        }
        return this.prisma.registrationLink.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
                ...(dto.expiresAt !== undefined
                    ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
                    : {}),
                ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
            },
        });
    }

    async getActiveByToken(token: string): Promise<LinkWithPortal> {
        const link = await this.prisma.registrationLink.findUnique({
            where: { token },
            include: { portal: { select: PORTAL_SUMMARY_SELECT } },
        });
        if (!link || !link.isActive) {
            throw new NotFoundException("Registration link not found or inactive");
        }
        if (link.expiresAt && link.expiresAt < new Date()) {
            throw new NotFoundException("Registration link has expired");
        }
        if (link.maxUses !== null && link.usesCount >= link.maxUses) {
            throw new NotFoundException("Registration link usage limit reached");
        }
        return link;
    }

    async getPublicInfo(token: string): Promise<{
        portalSlug: string;
        portalDisplayName: string;
        schema: unknown;
    }> {
        const link = await this.getActiveByToken(token);
        const schema = await this.formSchemaService.getFormSchema(
            link.portalId,
            ENTITY_DEFINITION_CODES.MEMBER,
            FormPurpose.public_registration
        );
        return {
            portalSlug: link.portal.name,
            portalDisplayName: link.portal.displayName,
            schema,
        };
    }

    async registerViaLink(
        token: string,
        dto: RegisterViaLinkDto
    ): Promise<RegisterViaLinkResponseDto> {
        const link = await this.getActiveByToken(token);

        const { user, created, claimed } = await this.accountProvisioning.ensureUserWithPassword(
            dto.email,
            dto.password,
            { emailVerified: false }
        );
        const accountCreated = created || claimed;

        const existing = await this.prisma.member.findUnique({
            where: { userId_portalId: { userId: user.id, portalId: link.portalId } },
            select: { id: true },
        });
        if (existing) {
            throw new ConflictException("User is already a member of this portal");
        }

        const member = await this.joinPortalService.joinPortal({
            userId: user.id,
            portalId: link.portalId,
            fields: dto.fields ?? {},
            joinSource:
                link.kind === RegistrationLinkKind.kiosk
                    ? MemberJoinSource.kiosk
                    : MemberJoinSource.registration_link,
            registrationLinkId: link.id,
        });

        await this.prisma.registrationLink.update({
            where: { id: link.id },
            data: { usesCount: { increment: 1 } },
        });

        return {
            userId: user.id,
            memberId: member.id,
            portalSlug: link.portal.name,
            accountCreated,
        };
    }
}
