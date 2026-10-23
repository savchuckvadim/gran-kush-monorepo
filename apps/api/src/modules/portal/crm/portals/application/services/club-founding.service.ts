import { ConflictException, Injectable } from "@nestjs/common";

import { Employee, Portal, Prisma, User } from "@prisma/client";

import { BrandService } from "@common/brand/brand.service";
import { LEGAL_TERMS_VERSION } from "@common/legal/legal-terms";
import { PrismaService } from "@common/prisma/prisma.service";
import { isUniqueViolationOn } from "@common/prisma/unique-violation";
import { BillingSettings } from "@modules/billing/application/billing-settings";
import { DomainEventPublisher } from "@modules/events";
import { createSystemRoles } from "@modules/portal/crm/access/infrastructure/portal-role-prisma.repository";
import { ProvisionPortalFromTemplatesService } from "@modules/portal/crm/entity-fields/application/services/provision-portal-from-templates.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

import { CreateClubDto } from "../../api/dto/create-club.dto";
import { clubFoundedEvents } from "../events/club-founded-events";

/** Machine-readable 409 reasons: the registration form answers them with a hint, not just the text. */
export const CLUB_CONFLICT_CODES = { emailTaken: "email_taken", slugTaken: "slug_taken" } as const;

export const emailTakenError = () =>
    new ConflictException({
        message: "User with this email already exists",
        code: CLUB_CONFLICT_CODES.emailTaken,
    });

const slugTakenError = () =>
    new ConflictException({
        message: "Portal with this name already exists",
        code: CLUB_CONFLICT_CODES.slugTaken,
    });

/** What a founded club returns: the portal and its owner (with the account). */
export interface FoundedClub {
    portal: Portal;
    owner: Employee & { user: User };
}

/**
 * Founding a club: the portal, its configuration from templates and the owner. Shared by the
 * registration from the product site (a new account) and by a signed-in account that opens one
 * more club. Both run it inside their own transaction with the account.
 */
@Injectable()
export class ClubFoundingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly provisionFromTemplates: ProvisionPortalFromTemplatesService,
        private readonly billingSettings: BillingSettings,
        private readonly events: DomainEventPublisher,
        private readonly brand: BrandService
    ) {}

    /** 409 before the transaction for the common case; the unique index covers the race. */
    async assertNameFree(name: string): Promise<void> {
        const existing = await this.prisma.portal.findUnique({
            where: { name: name.trim().toLowerCase() },
            select: { id: true },
        });
        if (existing) {
            throw slugTakenError();
        }
    }

    /** A transaction for founding: a race on the unique indexes answers 409, not 500. */
    async inTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        try {
            return await this.prisma.$transaction(run);
        } catch (error: unknown) {
            if (isUniqueViolationOn(error, "email")) {
                throw emailTakenError();
            }
            if (isUniqueViolationOn(error, "name")) {
                throw slugTakenError();
            }
            throw error;
        }
    }

    /**
     * The club, its entities and statuses from templates, and the account as its owner. The kind
     * of portal is the installation's (a club on PafPaf, a studio on Ink Space), so the templates
     * match it. The `portal.founded` event is written in the same transaction: its consumers send
     * the welcome letter and the platform alert once, even when the request is retried.
     */
    async found(
        tx: Prisma.TransactionClient,
        ownerUserId: string,
        dto: CreateClubDto
    ): Promise<FoundedClub> {
        const portal = await tx.portal.create({
            data: {
                type: this.brand.portalType,
                name: dto.name.trim().toLowerCase(),
                displayName: dto.displayName.trim(),
                termsAcceptedAt: new Date(),
                termsVersion: LEGAL_TERMS_VERSION,
                termsAcceptedByUserId: ownerUserId,
            },
        });

        await this.provisionFromTemplates.provisionPortal(portal.id, portal.type, tx, {
            planCode: dto.planCode,
            trialEndsAt: this.billingSettings.trialEndFrom(new Date()),
        });

        const { ownerRoleId } = await createSystemRoles(tx, portal.id);

        const employeeDef = await tx.entityDefinition.findUniqueOrThrow({
            where: {
                portalId_code: { portalId: portal.id, code: ENTITY_DEFINITION_CODES.EMPLOYEE },
            },
        });
        const record = await tx.entityRecord.create({
            data: { portalId: portal.id, entityDefinitionId: employeeDef.id },
        });
        const owner = await tx.employee.create({
            data: {
                portalId: portal.id,
                userId: ownerUserId,
                entityRecordId: record.id,
                roleId: ownerRoleId,
                isActive: true,
            },
            include: { user: true },
        });

        const ownerFields: Record<string, string> = {
            first_name: dto.ownerName.trim(),
            ...(dto.ownerSurname?.trim() ? { last_name: dto.ownerSurname.trim() } : {}),
        };
        for (const [fieldKey, value] of Object.entries(ownerFields)) {
            const fieldDef = await tx.fieldDefinition.findUnique({
                where: {
                    entityDefinitionId_fieldKey: { entityDefinitionId: employeeDef.id, fieldKey },
                },
                select: { id: true },
            });
            if (fieldDef) {
                await tx.fieldValue.create({
                    data: {
                        portalId: portal.id,
                        entityRecordId: record.id,
                        fieldDefinitionId: fieldDef.id,
                        valueIndex: 0,
                        valueJson: value,
                    },
                });
            }
        }

        const club = { portal, owner };
        await this.events.publishMany(tx, clubFoundedEvents(club, dto));
        return club;
    }
}
