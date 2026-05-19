import { BadRequestException, Injectable } from "@nestjs/common";

import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";

import { MemberConfirmEmailResponseDto } from "../../api/dto/member-confirm-email.dto";

@Injectable()
export class MemberRegistrationService {
    constructor(
        private readonly membersService: MembersService,
        private readonly emailVerificationService: EmailVerificationService
    ) {}

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
