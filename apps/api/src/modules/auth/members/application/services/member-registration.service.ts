import { BadRequestException, Injectable } from "@nestjs/common";

import { RegisterMemberDto } from "@auth/members/api/dto/register-member.dto";
import { MembersService } from "@members/application/services/members.service";

import { EmailVerificationService } from "@modules/auth/shared/application/services/email-verification.service";
import { UserRepository } from "@modules/users/domain/repositories/user-repository.interface";

import { MemberConfirmEmailResponseDto } from "../../api/dto/member-confirm-email.dto";

@Injectable()
export class MemberRegistrationService {
    constructor(
        private readonly membersService: MembersService,
        private readonly emailVerificationService: EmailVerificationService
    ) {}

    /**
     * Создание Member с User
     */
    async createMember(
        dto: RegisterMemberDto,
        force: boolean = false,
        portalId: string
    ): Promise<{
        userId: string;
        memberId: string;
    }> {
        return this.membersService.createMember(dto, force, portalId);
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
