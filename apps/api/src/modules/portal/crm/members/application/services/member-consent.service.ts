import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";

import { MemberConsentStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";

import { MemberDocumentShareRepository } from "@modules/account/domain/repositories/member-document-share-repository.interface";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";
import { MailService } from "@modules/mail/application/services/mail.service";
import type { SupportedLanguage } from "@modules/mail/consts/mail.constants";
import { MemberWithRelations } from "@modules/portal/crm/members/domain/entity/member.entity";
import { MemberRepository } from "@modules/portal/crm/members/domain/repositories/member-repository.interface";

import {
    ConfirmMemberConsentDto,
    DeclineMemberConsentDto,
    MemberConsentResultDto,
    PublicMemberConsentInfoDto,
} from "../../api/dto/member-consent.dto";

const CONSENT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Согласие владельца аккаунта на членство, которое завёл клуб (TASK-663). Клуб знает только
 * email; токен уходит письмом, и владелец ещё доказывает, что аккаунт его, паролем — поэтому
 * сотрудник клуба не может «согласиться» за него.
 */
@Injectable()
export class MemberConsentService {
    private readonly logger = new Logger(MemberConsentService.name);

    constructor(
        private readonly memberRepository: MemberRepository,
        private readonly userDocumentRepository: UserDocumentRepository,
        private readonly userSignatureRepository: UserSignatureRepository,
        private readonly shares: MemberDocumentShareRepository,
        private readonly mailService: MailService
    ) {}

    newToken(): string {
        return randomBytes(32).toString("hex");
    }

    /** Письмо владельцу; его сбой не должен ронять создание участника. */
    async sendRequest(member: MemberWithRelations, language: SupportedLanguage): Promise<void> {
        if (!member.consentToken) {
            return;
        }
        try {
            await this.mailService.sendMembershipConsent({
                to: member.user.email,
                token: member.consentToken,
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
        const updated = await this.memberRepository.update(member.id, {
            consentToken: this.newToken(),
            consentRequestedAt: new Date(),
        });
        await this.sendRequest(updated, language);
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
        };
    }

    async confirm(token: string, dto: ConfirmMemberConsentDto): Promise<MemberConsentResultDto> {
        const member = await this.getPending(token);
        await this.verifyPassword(member, dto.password);

        const own = await this.userDocumentRepository.findAllByUser(member.userId);
        const ownIds = new Set(own.map((document) => document.id));
        const requested = dto.shareDocumentIds ?? [];
        if (requested.some((id) => !ownIds.has(id))) {
            throw new BadRequestException("Unknown document");
        }

        await this.memberRepository.update(member.id, {
            consentStatus: MemberConsentStatus.confirmed,
            consentToken: null,
            consentConfirmedAt: new Date(),
        });
        await this.shares.shareDocuments(member.id, requested);
        if (dto.shareSignature) {
            const signature = await this.userSignatureRepository.findByUser(member.userId);
            await this.shares.setSignatureShared(member.id, signature !== null);
        }
        return { portalSlug: member.portal.name, memberId: member.id };
    }

    async decline(token: string, dto: DeclineMemberConsentDto): Promise<MemberConsentResultDto> {
        const member = await this.getPending(token);
        await this.verifyPassword(member, dto.password);
        await this.memberRepository.deleteWithProfile(member.id);
        return { portalSlug: member.portal.name };
    }

    private async getPending(token: string): Promise<MemberWithRelations> {
        const member = await this.memberRepository.findByConsentToken(token);
        if (!member || member.consentStatus !== MemberConsentStatus.pending) {
            throw new NotFoundException("Consent request not found");
        }
        const requestedAt = member.consentRequestedAt?.getTime() ?? 0;
        if (Date.now() - requestedAt > CONSENT_TTL_MS) {
            throw new NotFoundException("Consent request has expired");
        }
        return member;
    }

    private async verifyPassword(member: MemberWithRelations, password: string): Promise<void> {
        const hash = member.user.passwordHash;
        const matches = hash ? await bcrypt.compare(password, hash) : false;
        if (!matches) {
            throw new UnauthorizedException("Invalid password for this account");
        }
    }
}
