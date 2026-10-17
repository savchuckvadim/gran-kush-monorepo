import { BadRequestException, Injectable } from "@nestjs/common";

import type { SupportedLanguage } from "@mail/consts/mail.constants";
import { MemberJoinSource, UserAccountStatus } from "@prisma/client";
import { AccountOwnershipService } from "@users/application/services/account-ownership.service";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

import { issueSecretToken } from "@common/crypto/secret-token";
import { isUniqueViolationOn } from "@common/prisma/unique-violation";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { UploadMemberFilesDto } from "@modules/portal/crm/members/api/dto/upload-member-files.dto";
import { JoinPortalService } from "@modules/portal/crm/members/application/services/join-portal.service";
import { MemberFilesService } from "@modules/portal/crm/members/application/services/member-files.service";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";

import { MemberConfirmEmailResponseDto } from "../../api/dto/member-confirm-email.dto";

/** Что отвечает регистрация: одно и то же для нового и занятого адреса (TASK-665). */
export interface RegisterMemberResult {
    email: string;
}

const BCRYPT_ROUNDS = 10;

/**
 * Глобальная регистрация member-аккаунта. Сессия до подтверждения почты не выдаётся (TASK-664).
 * - Ответ не выдаёт, занят ли адрес (TASK-665): занятому (с паролем или заявленному) уходит письмо
 *   «аккаунт уже есть, войдите», ответ тот же, что у новой регистрации; пароль хешируется и тут,
 *   чтобы и по времени ответа нельзя было отличить.
 * - Новый email → User (isActive=false до подтверждения) + письмо подтверждения.
 * - pending_claim аккаунт (создан клубом) → пароль не ставится: письмо со ссылкой, по которой
 *   владелец адреса сам задаёт пароль. Иначе пароль к чужому аккаунту задал бы любой, кто знает email.
 * - Если запрос пришёл в контексте портала (X-Portal-*) — вступление в клуб.
 */
@Injectable()
export class MemberRegistrationService {
    constructor(
        private readonly membersService: MembersService,
        private readonly userRepository: UserRepository,
        private readonly ownership: AccountOwnershipService,
        private readonly joinPortalService: JoinPortalService,
        private readonly emailVerificationService: EmailVerificationService,
        private readonly memberFilesService: MemberFilesService
    ) {}

    async register(dto: {
        email: string;
        password: string;
        fields?: Record<string, unknown>;
        files?: UploadMemberFilesDto;
        portalId?: string;
        language: SupportedLanguage;
    }): Promise<RegisterMemberResult> {
        const email = dto.email.toLowerCase();
        if (dto.files) {
            this.memberFilesService.assertValid(dto.files);
        }
        const existing = await this.userRepository.findByEmail(dto.email);
        if (
            existing &&
            (this.ownership.isClaimed(existing) || this.ownership.hasPassword(existing))
        ) {
            await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
            return this.accountExists(email, dto.language);
        }

        const claimByEmail = existing !== null;
        const created = existing ? null : await this.createUser(dto);
        const userId = existing?.id ?? created?.id;
        if (!userId) return this.accountExists(email, dto.language);

        let memberId: string | undefined;
        let portalName: string | undefined;
        if (dto.portalId) {
            const alreadyMember = await this.membersService.findByUserAndPortal(
                userId,
                dto.portalId
            );
            if (alreadyMember) {
                memberId = alreadyMember.id;
            } else {
                const member = await this.joinPortalService.joinPortal({
                    userId,
                    portalId: dto.portalId,
                    fields: dto.fields ?? {},
                    joinSource: MemberJoinSource.self,
                    // Владение адресом не доказано: членство ждёт клейма аккаунта
                    // (подтвердится в resetPassword, когда владелец задаст пароль)
                    consent: claimByEmail
                        ? { tokenHash: issueSecretToken().hash, requestedAt: new Date() }
                        : undefined,
                });
                memberId = member.id;
                portalName = member.portal.displayName;
            }
        }

        const mail = { app: "member" as const, language: dto.language };
        if (claimByEmail) {
            // Пароль из формы не используется: его задаст тот, кто откроет письмо. Файлы в чужой
            // аккаунт тоже не попадают — их увидели бы клубы, где этот аккаунт уже состоит
            await this.emailVerificationService.sendAccountSetup(dto.email, {
                ...mail,
                portalName,
            });
        } else {
            if (dto.files) {
                // Файлы, приложенные к вступлению в клуб, показываются этому клубу и только ему
                await this.memberFilesService.queueUpload({
                    userId,
                    ...dto.files,
                    shareWithMemberId: memberId,
                });
            }
            await this.emailVerificationService.sendVerificationEmailToUserId(userId, mail);
        }

        return { email };
    }

    private async accountExists(
        email: string,
        language: SupportedLanguage
    ): Promise<RegisterMemberResult> {
        await this.emailVerificationService.notifyAccountExists(email, language);
        return { email };
    }

    /** Два одновременных запроса с одним email: гонка на unique-индексе — `null`, адрес занят. */
    private async createUser(dto: {
        email: string;
        password: string;
    }): Promise<{ id: string } | null> {
        try {
            return await this.userRepository.create({
                email: dto.email,
                passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
                status: UserAccountStatus.active,
                isActive: false,
                emailConfirmed: false,
            });
        } catch (error: unknown) {
            if (isUniqueViolationOn(error, "email")) return null;
            throw error;
        }
    }

    /**
     * Подтверждение email по ссылке из письма
     */
    async confirmEmail(token: string): Promise<MemberConfirmEmailResponseDto> {
        const { success, message } = await this.emailVerificationService.verifyEmail(token);
        if (!success) {
            throw new BadRequestException(message);
        }
        return {
            success: true,
            message: "Email confirmed successfully",
        };
    }
}
