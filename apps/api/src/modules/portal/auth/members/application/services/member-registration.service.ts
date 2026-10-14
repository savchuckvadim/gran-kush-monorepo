import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

import type { SupportedLanguage } from "@mail/consts/mail.constants";
import { MemberJoinSource, UserAccountStatus } from "@prisma/client";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { UploadMemberFilesDto } from "@modules/portal/crm/members/api/dto/upload-member-files.dto";
import { JoinPortalService } from "@modules/portal/crm/members/application/services/join-portal.service";
import { MemberFilesService } from "@modules/portal/crm/members/application/services/member-files.service";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";

import { MemberConfirmEmailResponseDto } from "../../api/dto/member-confirm-email.dto";

export interface RegisterMemberResult {
    userId: string;
    email: string;
    /** Мост member, если регистрация шла в контексте портала */
    memberId?: string;
}

/**
 * Глобальная регистрация member-аккаунта. Сессия до подтверждения почты не выдаётся (TASK-664).
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
        const existing = await this.userRepository.findByEmail(dto.email);
        if (
            existing &&
            (existing.passwordHash !== null || existing.status !== UserAccountStatus.pending_claim)
        ) {
            throw new ConflictException("User with this email already exists");
        }
        if (dto.files) {
            this.memberFilesService.assertValid(dto.files);
        }

        const claimByEmail = existing !== null;
        const userId = existing
            ? existing.id
            : (
                  await this.userRepository.create({
                      email: dto.email,
                      passwordHash: await bcrypt.hash(dto.password, 10),
                      status: UserAccountStatus.active,
                      isActive: false,
                      emailConfirmed: false,
                  })
              ).id;

        let memberId: string | undefined;
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
                    shareDocuments: !claimByEmail,
                });
                memberId = member.id;
            }
        }

        const mail = { app: "member" as const, language: dto.language };
        if (claimByEmail) {
            // Пароль из формы не используется: его задаст тот, кто откроет письмо. Файлы в чужой
            // аккаунт тоже не попадают — их увидели бы клубы, где этот аккаунт уже состоит
            await this.emailVerificationService.sendAccountSetup(dto.email, mail);
        } else {
            if (dto.files) {
                await this.memberFilesService.queueUpload({ userId, ...dto.files });
            }
            await this.emailVerificationService.sendVerificationEmailToUserId(userId, mail);
        }

        return { userId, email: dto.email.toLowerCase(), memberId };
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
