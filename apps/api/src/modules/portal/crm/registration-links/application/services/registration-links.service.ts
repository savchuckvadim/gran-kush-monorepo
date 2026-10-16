import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { FormPurpose, Prisma, RegistrationLink, RegistrationLinkKind } from "@prisma/client";
import { randomBytes } from "crypto";

import { ContentLocale } from "@common/i18n";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import { PrismaService } from "@common/prisma/prisma.service";
import { FormSchemaService } from "@modules/portal/crm/entity-fields/application/services/form-schema.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import { PORTAL_SUMMARY_SELECT } from "@modules/portal/crm/portals/infrastructure/prisma-includes/portal-summary.select";

import {
    CreateRegistrationLinkDto,
    PublicRegistrationLinkInfoDto,
    RegistrationLinkStatus,
    UpdateRegistrationLinkDto,
} from "../../api/dto/registration-link.dto";
import { normalizeLinkPrefill } from "../../domain/registration-link-prefill";

import { RegistrationLinkPresenceService } from "./registration-link-presence.service";

export type LinkWithPortal = RegistrationLink & {
    portal: { id: string; name: string; displayName: string };
};

export const registrationLinkListInclude = {
    createdByEmployee: { select: { id: true, user: { select: { email: true } } } },
} as const;

export type RegistrationLinkListItem = Prisma.RegistrationLinkGetPayload<{
    include: typeof registrationLinkListInclude;
}> & { online: number; status: RegistrationLinkStatus };

/** A personal link is for one person: it lives a week and works once. */
const PERSONAL_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Ссылки-формы клуба: выдача, список, отключение и отзыв, чтение по токену. Вступление — `RegistrationLinkJoinService`. */
@Injectable()
export class RegistrationLinksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly formSchemaService: FormSchemaService,
        private readonly presence: RegistrationLinkPresenceService
    ) {}

    /** Status is derived, not stored: the same fields decide whether the public page opens. */
    static statusOf(
        link: Pick<
            RegistrationLink,
            "isActive" | "revokedAt" | "expiresAt" | "maxUses" | "usesCount"
        >,
        now = new Date()
    ): RegistrationLinkStatus {
        if (link.revokedAt) return RegistrationLinkStatus.revoked;
        if (!link.isActive) return RegistrationLinkStatus.disabled;
        if (link.expiresAt && link.expiresAt < now) return RegistrationLinkStatus.expired;
        if (link.maxUses !== null && link.usesCount >= link.maxUses) {
            return RegistrationLinkStatus.exhausted;
        }
        return RegistrationLinkStatus.ready;
    }

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

        const kind = dto.kind ?? RegistrationLinkKind.public_link;
        const personal = kind === RegistrationLinkKind.personal;
        const prefill = normalizeLinkPrefill(dto.prefill);

        return this.prisma.registrationLink.create({
            data: {
                portalId,
                entityDefinitionId: memberDef.id,
                token: randomBytes(24).toString("hex"),
                name: dto.name,
                kind,
                expiresAt: dto.expiresAt
                    ? new Date(dto.expiresAt)
                    : personal
                      ? new Date(Date.now() + PERSONAL_LINK_TTL_MS)
                      : null,
                maxUses: dto.maxUses ?? (personal ? 1 : null),
                ...(prefill ? { prefillJson: prefill as Prisma.InputJsonObject } : {}),
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

    async listPage(
        portalId: string,
        page: number,
        limit: number,
        status?: RegistrationLinkStatus
    ): Promise<PaginatedResult<RegistrationLinkListItem>> {
        const where: Prisma.RegistrationLinkWhereInput = {
            portalId,
            ...(await this.statusWhere(portalId, status)),
        };
        const [rows, total] = await Promise.all([
            this.prisma.registrationLink.findMany({
                where,
                include: registrationLinkListInclude,
                orderBy: { createdAt: "desc" },
                skip: PaginationUtil.getSkip(page, limit),
                take: limit,
            }),
            this.prisma.registrationLink.count({ where }),
        ]);
        const online = await this.presence.countOnlineMany(rows.map((row) => row.token));
        const items = rows.map((row) => ({
            ...row,
            online: online.get(row.token) ?? 0,
            status: RegistrationLinksService.statusOf(row),
        }));
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
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

    /** Revocation is final: unlike `isActive`, it cannot be switched back on. */
    async revoke(id: string, portalId: string): Promise<RegistrationLink> {
        const link = await this.prisma.registrationLink.findFirst({ where: { id, portalId } });
        if (!link) {
            throw new NotFoundException("Registration link not found");
        }
        if (link.revokedAt) {
            return link;
        }
        return this.prisma.registrationLink.update({
            where: { id },
            data: { revokedAt: new Date(), isActive: false },
        });
    }

    async getActiveByToken(token: string): Promise<LinkWithPortal> {
        const link = await this.prisma.registrationLink.findUnique({
            where: { token },
            include: { portal: { select: PORTAL_SUMMARY_SELECT } },
        });
        if (!link || RegistrationLinksService.statusOf(link) !== RegistrationLinkStatus.ready) {
            throw new NotFoundException("Registration link not found or inactive");
        }
        return link;
    }

    async getPublicInfo(
        token: string,
        locale: ContentLocale
    ): Promise<PublicRegistrationLinkInfoDto> {
        const link = await this.getActiveByToken(token);
        const schema = await this.formSchemaService.getFormSchema(
            link.portalId,
            ENTITY_DEFINITION_CODES.MEMBER,
            FormPurpose.public_registration,
            locale
        );
        return {
            portalSlug: link.portal.name,
            portalDisplayName: link.portal.displayName,
            kind: link.kind,
            schema,
            prefill: normalizeLinkPrefill(link.prefillJson),
        };
    }

    /**
     * The list filter mirrors {@link statusOf}. `usesCount >= maxUses` compares two columns,
     * which Prisma's `where` cannot express, so exhausted ids come from one raw query first.
     */
    private async statusWhere(
        portalId: string,
        status?: RegistrationLinkStatus
    ): Promise<Prisma.RegistrationLinkWhereInput> {
        const now = new Date();
        const alive = { revokedAt: null, isActive: true } as const;
        switch (status) {
            case undefined:
                return {};
            case RegistrationLinkStatus.revoked:
                return { revokedAt: { not: null } };
            case RegistrationLinkStatus.disabled:
                return { revokedAt: null, isActive: false };
            case RegistrationLinkStatus.expired:
                return { ...alive, expiresAt: { lt: now } };
            case RegistrationLinkStatus.exhausted:
                return {
                    ...alive,
                    OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
                    id: { in: await this.exhaustedIds(portalId) },
                };
            case RegistrationLinkStatus.ready:
                return {
                    ...alive,
                    OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
                    id: { notIn: await this.exhaustedIds(portalId) },
                };
        }
    }

    private async exhaustedIds(portalId: string): Promise<string[]> {
        const rows = await this.prisma.$queryRaw<{ id: string }[]>`
            SELECT "id" FROM "registration_links"
            WHERE "portal_id" = ${portalId}
              AND "max_uses" IS NOT NULL
              AND "uses_count" >= "max_uses"
        `;
        return rows.map((row) => row.id);
    }
}
