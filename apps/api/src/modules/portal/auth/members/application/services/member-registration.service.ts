import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

import { MemberJoinSource, UserAccountStatus } from "@prisma/client";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { JoinPortalService } from "@modules/portal/crm/members/application/services/join-portal.service";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";

import { MemberConfirmEmailResponseDto } from "../../api/dto/member-confirm-email.dto";

export interface RegisterMemberResult {
    userId: string;
    email: string;
    /** Аккаунт был pending_claim и заклеймлен этим запросом */
    claimed: boolean;
    /** Мост member, если регистрация шла в контексте портала */
    memberId?: string;
}

/**
 * Глобальная регистрация member-аккаунта.
 * - Новый email → User (isActive=false до подтверждения) + письмо.
 * - pending_claim аккаунт (создан клубом) → клейм: установка пароля.
 * - Если запрос пришёл в контексте портала (X-Portal-*) — сразу вступление в клуб.
 */
@Injectable()
export class MemberRegistrationService {
    constructor(
        private readonly membersService: MembersService,
        private readonly userRepository: UserRepository,
        private readonly joinPortalService: JoinPortalService,
        private readonly emailVerificationService: EmailVerificationService
    ) {}

    async register(dto: {
        email: string;
        password: string;
        fields?: Record<string, unknown>;
        portalId?: string;
    }): Promise<RegisterMemberResult> {
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const existing = await this.userRepository.findByEmail(dto.email);

        let userId: string;
        let claimed = false;

        if (existing) {
            if (
                existing.passwordHash !== null ||
                existing.status !== UserAccountStatus.pending_claim
            ) {
                throw new ConflictException("User with this email already exists");
            }
            // Клейм аккаунта, созданного клубом
            await this.userRepository.update(existing.id, {
                passwordHash,
                status: UserAccountStatus.active,
            });
            userId = existing.id;
            claimed = true;
        } else {
            const user = await this.userRepository.create({
                email: dto.email,
                passwordHash,
                status: UserAccountStatus.active,
                isActive: false,
                emailConfirmed: false,
            });
            userId = user.id;
        }

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
                });
                memberId = member.id;
            }
        }

        await this.emailVerificationService.sendVerificationEmailToUserId(userId);

        return { userId, email: dto.email.toLowerCase(), claimed, memberId };
    }

    /**
     * Проверка существования пользователя
     */
    async checkUserExists(email: string) {
        return this.membersService.checkUserExists(email);
    }

    /**
     * Подтверждение email
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
