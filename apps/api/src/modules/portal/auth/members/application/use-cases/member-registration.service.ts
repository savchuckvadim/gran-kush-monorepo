import { Injectable } from "@nestjs/common";

import { FormPurpose } from "@prisma/client";
import { randomUUID } from "crypto";

import { RegisterMemberResponseDto } from "@modules/portal/auth/members/api/dto/register-member-response.dto";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import { MemberRegistrationService } from "@modules/portal/auth/members/application/services/member-registration.service";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";
import { DynamicMemberRegistrationDto } from "@modules/portal/crm/members/api/dto/dynamic-member.dto";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";

@Injectable()
export class MemberRegistrationUseCase {
    constructor(
        private readonly memberRegistrationService: MemberRegistrationService,
        private readonly memberAuthService: MemberAuthService,
        private readonly membersService: MembersService,
        private readonly emailVerificationService: EmailVerificationService
    ) {}

    async execute(
        dto: DynamicMemberRegistrationDto,
        force: boolean = false,
        portalId: string
    ): Promise<RegisterMemberResponseDto> {
        const { userId, memberId } = await this.membersService.createMemberWithDynamicFields(
            dto,
            force,
            portalId,
            FormPurpose.public_registration
        );

        const userWithMember = await this.membersService.findByUserId(userId);
        if (!userWithMember) {
            throw new Error("Failed to create member");
        }

        const fullDto = await this.membersService.toCrmMemberFullDto(userWithMember);

        const deviceId = randomUUID();
        const tokens = await this.memberAuthService.generateTokens(
            userWithMember,
            userWithMember.user,
            deviceId
        );

        const userCheck = await this.memberRegistrationService.checkUserExists(dto.email);

        await this.emailVerificationService.sendMemberVerificationEmail(
            {
                id: userWithMember.id,
                userId: userWithMember.userId,
                name: fullDto.name,
                surname: fullDto.surname,
            },
            userWithMember.user
        );

        return {
            ...tokens,
            memberId,
            user: {
                id: userWithMember.user.id,
                email: userWithMember.user.email,
                name: fullDto.name,
                surname: fullDto.surname || undefined,
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
