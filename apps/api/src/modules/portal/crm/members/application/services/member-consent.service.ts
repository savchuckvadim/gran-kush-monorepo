import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { MemberConsentStatus, MemberJoinSource } from "@prisma/client";
import { AccountOwnershipService } from "@users/application/services/account-ownership.service";

import { hashSecretToken, issueSecretToken } from "@common/crypto/secret-token";
import { MemberDocumentSharingService } from "@modules/account/application/services/member-document-sharing.service";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";
import { MailService } from "@modules/mail/application/services/mail.service";
import type { SupportedLanguage } from "@modules/mail/consts/mail.constants";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { MemberWithRelations } from "@modules/portal/crm/members/domain/entity/member.entity";
import { MemberRepository } from "@modules/portal/crm/members/domain/repositories/member-repository.interface";

import { ConfirmMyMembershipDto, MyMembershipDto } from "../../api/dto/cabinet-memberships.dto";
import {
    ConfirmMemberConsentDto,
    DeclineMemberConsentDto,
    MemberConsentResultDto,
    PublicMemberConsentInfoDto,
} from "../../api/dto/member-consent.dto";

const CONSENT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Согласие владельца аккаунта на членство, которое завёл клуб (TASK-663). Клуб знает только
 * email; токен уходит письмом, и сотрудник клуба не может «согласиться» за владельца.
 *
 * Если у аккаунта есть пароль, владелец вводит и его. Без пароля (только Google или аккаунт,
 * который завёл другой клуб) единственное доказательство — токен из письма на адрес аккаунта
 * (TASK-702): иначе такому человеку нечем подтвердить членство.
 */
@Injectable()
export class MemberConsentService {
    private readonly logger = new Logger(MemberConsentService.name);

    constructor(
        private readonly memberRepository: MemberRepository,
        private readonly userDocumentRepository: UserDocumentRepository,
        private readonly userSignatureRepository: UserSignatureRepository,
        private readonly sharing: MemberDocumentSharingService,
        private readonly mailService: MailService,
        private readonly ownership: AccountOwnershipService,
        private readonly emailVerification: EmailVerificationService
    ) {}

    /**
     * Письмо владельцу; его сбой не должен ронять создание участника. `token` — сам токен из
     * `issueSecretToken`: у членства в БД только его хеш.
     */
    async sendRequest(
        member: MemberWithRelations,
        token: string,
        language: SupportedLanguage
    ): Promise<void> {
        try {
            await this.mailService.sendMembershipConsent({
                to: member.user.email,
                token,
                portalName: member.portal.displayName,
                language,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Consent email for member ${member.id} failed: ${message}`);
        }
    }

    async resend(memberId: string, portalId: string, language: SupportedLanguage): Promise<void> {
        const member = await this.memberRepository.findByIdForPortal(memberId, portalId);
        if (!member) {
            throw new NotFoundException("Member not found");
        }
        if (member.consentStatus !== MemberConsentStatus.pending) {
            throw new BadRequestException("Membership is already confirmed");
        }
        const consent = issueSecretToken();
        const updated = await this.memberRepository.update(member.id, {
            consentToken: consent.hash,
            consentRequestedAt: new Date(),
        });
        // Членство из клейма (самостоятельная регистрация на чужой email) подтверждает письмо
        // «задайте пароль»; всё остальное — письмо согласия с токеном
        if (member.joinSource !== MemberJoinSource.crm && !this.ownership.isClaimed(member.user)) {
            await this.emailVerification.sendAccountSetup(member.user.email, {
                app: "member",
                language,
                portalName: member.portal.displayName,
            });
            return;
        }
        await this.sendRequest(updated, consent.token, language);
    }

    async getPublicInfo(token: string): Promise<PublicMemberConsentInfoDto> {
        const member = await this.getPending(token);
        const [documents, signature] = await Promise.all([
            this.userDocumentRepository.findAllByUser(member.userId),
            this.userSignatureRepository.findByUser(member.userId),
        ]);
        return {
            portalSlug: member.portal.name,
            portalDisplayName: member.portal.displayName,
            email: member.user.email,
            documents: documents.map((document) => ({
                id: document.id,
                type: document.type,
                side: document.side,
            })),
            hasSignature: signature !== null,
            requiresPassword: this.ownership.proofMethod(member.user) === "password",
        };
    }

    /** По ссылке из письма: токен плюс пароль, если он есть у аккаунта. */
    async confirm(token: string, dto: ConfirmMemberConsentDto): Promise<MemberConsentResultDto> {
        const member = await this.getPending(token);
        await this.verifyOwner(member, dto.password);
        return this.applyConfirmation(member, dto);
    }

    async decline(token: string, dto: DeclineMemberConsentDto): Promise<MemberConsentResultDto> {
        const member = await this.getPending(token);
        await this.verifyOwner(member, dto.password);
        await this.memberRepository.deleteWithProfile(member.id);
        return { portalSlug: member.portal.name };
    }

    /** Все членства аккаунта, в том числе ждущие подтверждения; закрытые выходом тоже видны. */
    async listMine(userId: string): Promise<MyMembershipDto[]> {
        const members = await this.memberRepository.findAllByUser(userId);
        return members.map((member) => ({
            memberId: member.id,
            portalId: member.portalId,
            slug: member.portal.name,
            displayName: member.portal.displayName,
            defaultSkin: member.portal.defaultSkin,
            consentStatus: member.consentStatus,
            joinSource: member.joinSource,
            isActive: member.isActive,
            consentExpired:
                member.consentStatus === MemberConsentStatus.pending
                    ? this.isExpired(member)
                    : undefined,
            createdAt: member.createdAt.toISOString(),
        }));
    }

    /**
     * Подтвердить своё членство под сессией: сессия уже доказала владение аккаунтом,
     * пароль и письмо не нужны. Клуб получает только отмеченные документы.
     */
    async confirmMine(
        userId: string,
        memberId: string,
        dto: ConfirmMyMembershipDto
    ): Promise<MemberConsentResultDto> {
        const member = await this.getMinePending(userId, memberId);
        await this.ownership.assertOwnerProof(member.user, { kind: "session", userId });
        return this.applyConfirmation(member, dto);
    }

    async declineMine(userId: string, memberId: string): Promise<MemberConsentResultDto> {
        const member = await this.getMinePending(userId, memberId);
        await this.ownership.assertOwnerProof(member.user, { kind: "session", userId });
        await this.memberRepository.deleteWithProfile(member.id);
        return { portalSlug: member.portal.name };
    }

    /**
     * Выйти из клуба: членство закрывается, показ документов и подписи отзывается.
     * История (заказы, визиты) остаётся у клуба — пропадает только доступ участника.
     */
    async leaveMine(userId: string, memberId: string): Promise<MemberConsentResultDto> {
        const member = await this.findMine(userId, memberId);
        if (!member) {
            throw new NotFoundException("Membership not found");
        }
        await this.memberRepository.update(member.id, { isActive: false });
        await this.sharing.revokeAll({
            userId,
            memberId: member.id,
            portalId: member.portalId,
        });
        return { portalSlug: member.portal.name, memberId: member.id };
    }

    private async applyConfirmation(
        member: MemberWithRelations,
        dto: { shareDocumentIds?: string[]; shareSignature?: boolean }
    ): Promise<MemberConsentResultDto> {
        const selection = { documentIds: dto.shareDocumentIds, signature: dto.shareSignature };
        // Сначала проверяем выбор: ошибка в нём не должна оставить членство подтверждённым
        await this.sharing.assertSelectable(member.userId, selection);

        await this.memberRepository.update(member.id, {
            consentStatus: MemberConsentStatus.confirmed,
            consentToken: null,
            consentConfirmedAt: new Date(),
        });
        await this.sharing.shareSelected({
            userId: member.userId,
            memberId: member.id,
            portalId: member.portalId,
            selection,
        });
        return { portalSlug: member.portal.name, memberId: member.id };
    }

    private isExpired(member: MemberWithRelations): boolean {
        const requestedAt = member.consentRequestedAt?.getTime() ?? 0;
        return Date.now() - requestedAt > CONSENT_TTL_MS;
    }

    private async getPending(token: string): Promise<MemberWithRelations> {
        const member = await this.memberRepository.findByConsentToken(hashSecretToken(token));
        if (!member || member.consentStatus !== MemberConsentStatus.pending) {
            throw new NotFoundException("Consent request not found");
        }
        if (this.isExpired(member)) {
            throw new NotFoundException("Consent request has expired");
        }
        return member;
    }

    private async findMine(userId: string, memberId: string): Promise<MemberWithRelations | null> {
        const all = await this.memberRepository.findAllByUser(userId);
        return all.find((candidate) => candidate.id === memberId) ?? null;
    }

    /** Своё ожидающее членство: чужой memberId выглядит так же, как несуществующий. */
    private async getMinePending(userId: string, memberId: string): Promise<MemberWithRelations> {
        const member = await this.findMine(userId, memberId);
        if (!member || member.consentStatus !== MemberConsentStatus.pending) {
            throw new NotFoundException("Consent request not found");
        }
        if (this.isExpired(member)) {
            throw new NotFoundException("Consent request has expired");
        }
        return member;
    }

    private async verifyOwner(
        member: MemberWithRelations,
        password: string | undefined
    ): Promise<void> {
        await this.ownership.assertOwnerProof(
            member.user,
            this.ownership.proofMethod(member.user) === "password"
                ? { kind: "password", password }
                : { kind: "mailbox_token" }
        );
    }
}
