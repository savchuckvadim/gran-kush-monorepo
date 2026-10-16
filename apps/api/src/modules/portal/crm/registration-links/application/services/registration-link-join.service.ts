import {
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import { MemberJoinSource, RegistrationLinkKind } from "@prisma/client";
import { AccountProvisioningService } from "@users/application/services/account-provisioning.service";
import { randomBytes } from "crypto";

import { ContentLocale } from "@common/i18n";
import { PrismaService } from "@common/prisma/prisma.service";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { JoinPortalService } from "@modules/portal/crm/members/application/services/join-portal.service";

import {
    JoinViaLinkDto,
    JoinViaLinkResponseDto,
    RegisterViaLinkDto,
    RegisterViaLinkResponseDto,
} from "../../api/dto/registration-link.dto";
import { normalizeLinkPrefill } from "../../domain/registration-link-prefill";

import { type LinkWithPortal, RegistrationLinksService } from "./registration-links.service";

/** On a shared kiosk tablet an existing account is never signed into: the person joins from their phone. */
export const KIOSK_EXISTING_ACCOUNT =
    "This email already has an account. Join from your own phone with the club link";

/**
 * Вступление в клуб по ссылке: регистрацией (новый аккаунт или клейм) или под своей сессией.
 *
 * Слот ссылки занимается одним атомарным UPDATE до вступления и возвращается, если вступление
 * не доехало до конца: два запроса по ссылке с одним местом не заводят двух участников.
 * Киоск — общий планшет клуба: существующий аккаунт на нём не вводит пароль и не входит сессией.
 */
@Injectable()
export class RegistrationLinkJoinService {
    private readonly logger = new Logger(RegistrationLinkJoinService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly links: RegistrationLinksService,
        private readonly accountProvisioning: AccountProvisioningService,
        private readonly joinPortalService: JoinPortalService,
        private readonly emailVerification: EmailVerificationService
    ) {}

    async registerViaLink(
        token: string,
        dto: RegisterViaLinkDto,
        locale: ContentLocale
    ): Promise<RegisterViaLinkResponseDto> {
        const link = await this.links.getActiveByToken(token);

        if (link.kind === RegistrationLinkKind.kiosk) {
            const existing = await this.prisma.user.findUnique({
                where: { email: dto.email },
                select: { id: true },
            });
            if (existing) {
                throw new ConflictException(KIOSK_EXISTING_ACCOUNT);
            }
        }

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
                joinSource: this.joinSourceOf(link),
                registrationLinkId: link.id,
                // Показ — только по явному выбору и только если владелец аккаунта доказан паролем;
                // у аккаунта из клейма он не доказан, и клуб не получает чужих документов
                share: claimByEmail
                    ? undefined
                    : { documentIds: dto.shareDocumentIds, signature: dto.shareSignature },
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

    /**
     * Вступление из уже открытой сессии: аккаунт один, новый не заводится и пароль не нужен —
     * владелец доказан самой сессией, поэтому документы можно показать клубу сразу, но только
     * выбранные. Киоск так не работает: на общем планшете чужая сессия не используется.
     */
    async joinViaLinkAsUser(
        token: string,
        userId: string,
        dto: JoinViaLinkDto
    ): Promise<JoinViaLinkResponseDto> {
        const link = await this.links.getActiveByToken(token);
        if (link.kind === RegistrationLinkKind.kiosk) {
            throw new ForbiddenException("A kiosk link does not accept a signed-in session");
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (!user) {
            throw new NotFoundException("Account not found");
        }

        // Личная ссылка выписана на один адрес: чужой аккаунт не должен тратить её
        const expectedEmail =
            link.kind === RegistrationLinkKind.personal
                ? normalizeLinkPrefill(link.prefillJson)?.email
                : undefined;
        if (expectedEmail && expectedEmail !== user.email.trim().toLowerCase()) {
            throw new ForbiddenException("This link was issued for another email address");
        }

        // Уже участник — отказ до траты слота: иначе одноразовая ссылка сгорела бы зря
        const existing = await this.prisma.member.findUnique({
            where: { userId_portalId: { userId, portalId: link.portalId } },
            select: { id: true },
        });
        if (existing) {
            throw new ConflictException("User is already a member of this portal");
        }

        await this.consumeUse(link.id);
        try {
            const member = await this.joinPortalService.joinPortal({
                userId,
                portalId: link.portalId,
                fields: dto.fields ?? {},
                joinSource: this.joinSourceOf(link),
                registrationLinkId: link.id,
                share: { documentIds: dto.shareDocumentIds, signature: dto.shareSignature },
            });
            return { memberId: member.id, portalSlug: link.portal.name };
        } catch (error) {
            await this.releaseUse(link.id);
            throw error;
        }
    }

    private joinSourceOf(link: LinkWithPortal): MemberJoinSource {
        return link.kind === RegistrationLinkKind.kiosk
            ? MemberJoinSource.kiosk
            : MemberJoinSource.registration_link;
    }

    /**
     * Атомарно занять одно использование ссылки. Лимит, активность и срок проверяются внутри
     * самого UPDATE, а `max_uses` сравнивается с колонкой, а не с прочитанным ранее значением:
     * изменение лимита в параллель не открывает окна для перерасхода.
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

    /** Вернуть слот, если вступление не доехало до конца. */
    private async releaseUse(linkId: string): Promise<void> {
        try {
            await this.prisma.$executeRaw`
                UPDATE "registration_links"
                SET "uses_count" = "uses_count" - 1
                WHERE "id" = ${linkId} AND "uses_count" > 0
            `;
        } catch {
            // Не маскируем исходную ошибку вступления: в худшем случае слот останется занятым,
            // что безопаснее перерасхода лимита.
        }
    }
}
