import { Injectable } from "@nestjs/common";

import { PortalCipherService } from "@encryption/application/services/portal-cipher.service";
import type { PortalTypeEnum } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type NewDomainEvent } from "@modules/events";

import {
    EMPTY_IDENTITY,
    type OrganizationIdentity,
    type OrganizationProfile,
    type OrganizationTaxSettings,
} from "../../domain/organization/organization-profile";
import { OrganizationProfileRepository } from "../../domain/repositories/organization-profile-repository.interface";

/** Контекст AAD реквизитов: шифротекст профиля не расшифруется в другой строке или портале */
const IDENTITY_CONTEXT = "organization_profile";

@Injectable()
export class OrganizationProfilePrismaRepository extends OrganizationProfileRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cipher: PortalCipherService,
        private readonly events: DomainEventPublisher
    ) {
        super();
    }

    async portalType(portalId: string): Promise<PortalTypeEnum | null> {
        const portal = await this.prisma.portal.findUnique({
            where: { id: portalId },
            select: { type: true },
        });
        return portal?.type ?? null;
    }

    async find(portalId: string): Promise<OrganizationProfile | null> {
        const row = await this.prisma.organizationProfile.findUnique({ where: { portalId } });
        if (!row) return null;
        const identity = await this.cipher.decryptJson<Partial<OrganizationIdentity>>(
            portalId,
            "finance",
            IDENTITY_CONTEXT,
            row.identity
        );
        return {
            legalForm: row.legalForm,
            country: row.country,
            currency: row.currency,
            vatRegime: row.vatRegime,
            incomeTaxRegime: row.incomeTaxRegime,
            pricesIncludeTax: row.pricesIncludeTax,
            fiscalYearStartMonth: row.fiscalYearStartMonth,
            identity: { ...EMPTY_IDENTITY, ...identity },
            updatedAt: row.updatedAt,
        };
    }

    async save(
        portalId: string,
        profile: OrganizationTaxSettings & { identity: OrganizationIdentity },
        employeeId: string,
        events: readonly NewDomainEvent[]
    ): Promise<OrganizationProfile> {
        const { identity, ...settings } = profile;
        const encrypted = await this.cipher.encryptJson(
            portalId,
            "finance",
            IDENTITY_CONTEXT,
            identity
        );
        const data = { ...settings, identity: encrypted, updatedByEmployeeId: employeeId };
        const row = await this.prisma.$transaction(async (tx) => {
            const saved = await tx.organizationProfile.upsert({
                where: { portalId },
                create: { portalId, ...data },
                update: data,
            });
            if (events.length) await this.events.publishMany(tx, events);
            return saved;
        });
        return { ...settings, identity, updatedAt: row.updatedAt };
    }
}
