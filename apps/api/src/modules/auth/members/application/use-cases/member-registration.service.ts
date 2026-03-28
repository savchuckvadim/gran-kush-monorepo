import { Injectable } from "@nestjs/common";

import { RegisterMemberDto } from "@auth/members/api/dto/register-member.dto";
import { RegisterMemberResponseDto } from "@auth/members/api/dto/register-member-response.dto";
import { MemberAuthService } from "@auth/members/application/services/member-auth.service";
import { MemberRegistrationService } from "@auth/members/application/services/member-registration.service";
import { EmailVerificationService } from "@auth/shared/application/services/email-verification.service";
import { MembersService } from "@members/application/services/members.service";
import { randomUUID } from "crypto";

@Injectable()
export class MemberRegistrationUseCase {
    constructor(
        private readonly memberRegistrationService: MemberRegistrationService,
        private readonly memberAuthService: MemberAuthService,
        private readonly membersService: MembersService,
        private readonly emailVerificationService: EmailVerificationService
    ) {}

    async execute(
        dto: RegisterMemberDto,
        force: boolean = false,
        portalId: string
    ): Promise<RegisterMemberResponseDto> {
        // Создаем Member
        const { userId, memberId } = await this.memberRegistrationService.createMember(
            dto,
            force,
            portalId
        );

        // Получаем User и Member для генерации токенов
        const userWithMember = await this.membersService.findByUserId(userId);
        if (!userWithMember) {
            throw new Error("Failed to create member");
        }

        const deviceId = randomUUID();
        const tokens = await this.memberAuthService.generateTokens(
            userWithMember,
            userWithMember.user,
            deviceId
        );

        // Проверяем, был ли User уже Employee
        const userCheck = await this.memberRegistrationService.checkUserExists(dto.email);

        // Отправляем email для подтверждения
        await this.emailVerificationService.sendMemberVerificationEmail(
            userWithMember,
            userWithMember.user
        );

        return {
            ...tokens,
            memberId,
            user: {
                id: userWithMember.user.id,
                email: userWithMember.user.email,
                name: userWithMember.name,
                surname: userWithMember.surname || undefined,
            },
            warning: userCheck.hasEmployee
                ? {
                      message: userCheck.message || "",
                      hasEmployee: true,
                  }
                : undefined,
        };
    }
}
