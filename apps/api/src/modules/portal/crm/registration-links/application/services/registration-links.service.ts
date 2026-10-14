import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import {
    FormPurpose,
    MemberJoinSource,
    Prisma,
    RegistrationLink,
    RegistrationLinkKind,
} from "@prisma/client";
import { AccountProvisioningService } from "@users/application/services/account-provisioning.service";
import { randomBytes } from "crypto";

import { ContentLocale } from "@common/i18n";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import { PrismaService } from "@common/prisma/prisma.service";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { FormSchemaService } from "@modules/portal/crm/entity-fields/application/services/form-schema.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import { JoinPortalService } from "@modules/portal/crm/members/application/services/join-portal.service";
import { PORTAL_SUMMARY_SELECT } from "@modules/portal/crm/portals/infrastructure/prisma-includes/portal-summary.select";

import {
    CreateRegistrationLinkDto,
    RegisterViaLinkDto,
    RegisterViaLinkResponseDto,
    RegistrationLinkPrefillDto,
    RegistrationLinkStatus,
    UpdateRegistrationLinkDto,
} from "../../api/dto/registration-link.dto";

import { RegistrationLinkPresenceService } from "./registration-link-presence.service";

type LinkWithPortal = RegistrationLink & {
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

@Injectable()
export class RegistrationLinksService {
    private readonly logger = new Logger(RegistrationLinksService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly accountProvisioning: AccountProvisioningService,
        private readonly joinPortalService: JoinPortalService,
        private readonly formSchemaService: FormSchemaService,
        private readonly presence: RegistrationLinkPresenceService,
        private readonly emailVerification: EmailVerificationService
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
        const prefill = this.normalizePrefill(dto.prefill);

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
    ): Promise<{
        portalSlug: string;
        portalDisplayName: string;
        schema: unknown;
        prefill: RegistrationLinkPrefillDto | null;
    }> {
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
            schema,
            prefill: this.normalizePrefill(link.prefillJson),
        };
    }

    async registerViaLink(
        token: string,
        dto: RegisterViaLinkDto,
        locale: ContentLocale
    ): Promise<RegisterViaLinkResponseDto> {
        const link = await this.getActiveByToken(token);

        // Слот занимается ДО регистрации, одним атомарным UPDATE. Раньше лимит
        // проверялся чтением в getActiveByToken, а инкремент шёл в самом конце:
        // два параллельных запроса по ссылке с maxUses=1 оба проходили проверку
        // и оба заводили участника.
        await this.consumeUse(link.id);

        let account: Awaited<ReturnType<AccountProvisioningService["ensureUserWithPassword"]>>;
        let memberId: string;
        try {
            account = await this.accountProvisioning.ensureUserWithPassword(
                dto.email,
                dto.password,
                { emailVerified: false, verifyPassword: true }
            );
            const { user, claimByEmail } = account;

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
                // Пароль к аккаунту без пароля по ссылке не ставится, и его владелец ещё не
                // доказан — клуб не получает документы, которые туда загрузил другой клуб
                shareDocuments: !claimByEmail,
                // Членство из клейма ждёт, пока владелец адреса задаст пароль по ссылке
                // из письма (подтверждается в resetPassword); в CRM — бейдж «ждёт согласия»
                consent: claimByEmail
                    ? { token: randomBytes(32).toString("hex"), requestedAt: new Date() }
                    : undefined,
            });
            memberId = member.id;
        } catch (error) {
            await this.releaseUse(link.id);
            throw error;
        }

        // Участник уже в клубе: сбой очереди писем не должен откатывать регистрацию
        const { user, created, claimed, claimByEmail } = account;
        const mail = { app: "member" as const, language: locale };
        try {
            if (claimByEmail) {
                await this.emailVerification.sendAccountSetup(user.email, {
                    ...mail,
                    portalName: link.portal.displayName,
                });
            } else if (created) {
                await this.emailVerification.sendVerificationEmailToUserId(user.id, mail);
            }
        } catch (error: unknown) {
            this.logger.error(
                `Registration email for member ${memberId} was not queued`,
                error instanceof Error ? error.stack : String(error)
            );
        }

        return {
            userId: user.id,
            memberId,
            portalSlug: link.portal.name,
            accountCreated: created || claimed || claimByEmail,
        };
    }

    /** Only the two prefill keys survive: nothing else from a request body reaches the stored JSON. */
    private normalizePrefill(
        raw: RegistrationLinkPrefillDto | Prisma.JsonValue | null | undefined
    ): RegistrationLinkPrefillDto | null {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
        const source = raw as { email?: unknown; fields?: unknown };
        const prefill: RegistrationLinkPrefillDto = {};
        if (typeof source.email === "string" && source.email.trim()) {
            prefill.email = source.email.trim().toLowerCase();
        }
        if (source.fields && typeof source.fields === "object" && !Array.isArray(source.fields)) {
            const fields = Object.fromEntries(
                Object.entries(source.fields as Record<string, unknown>).filter(
                    ([, value]) => value !== undefined && value !== null && value !== ""
                )
            );
            if (Object.keys(fields).length > 0) prefill.fields = fields;
        }
        return prefill.email || prefill.fields ? prefill : null;
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

    /**
     * Атомарно занять одно использование ссылки.
     *
     * Условия лимита, активности и срока проверяются внутри самого UPDATE,
     * а `max_uses` сравнивается с колонкой, а не с прочитанным ранее значением,
     * поэтому изменение лимита в параллель не создаёт окна для перерасхода.
     */
    private async consumeUse(linkId: string): Promise<void> {
        const updated = await this.prisma.$executeRaw`
            UPDATE "registration_links"
            SET "uses_count" = "uses_count" + 1
            WHERE "id" = ${linkId}
              AND "is_active" = true
              AND "revoked_at" IS NULL
              AND ("expires_at" IS NULL OR "expires_at" > NOW())
              AND ("max_uses" IS NULL OR "uses_count" < "max_uses")
        `;

        if (updated === 0) {
            throw new NotFoundException("Registration link usage limit reached");
        }
    }

    /** Вернуть слот, если регистрация не доехала до конца. */
    private async releaseUse(linkId: string): Promise<void> {
        try {
            await this.prisma.$executeRaw`
                UPDATE "registration_links"
                SET "uses_count" = "uses_count" - 1
                WHERE "id" = ${linkId} AND "uses_count" > 0
            `;
        } catch {
            // Не маскируем исходную ошибку регистрации: в худшем случае слот
            // останется занятым, что безопаснее перерасхода лимита.
        }
    }
}
