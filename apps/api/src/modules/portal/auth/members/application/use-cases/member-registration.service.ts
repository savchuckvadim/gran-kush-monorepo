import { Injectable } from "@nestjs/common";

import { randomUUID } from "crypto";

import { RegisterMemberResponseDto } from "@modules/portal/auth/members/api/dto/register-member-response.dto";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import { MemberRegistrationService } from "@modules/portal/auth/members/application/services/member-registration.service";
import { DynamicMemberRegistrationDto } from "@modules/portal/crm/members/api/dto/dynamic-member.dto";

@Injectable()
export class MemberRegistrationUseCase {
    constructor(
        private readonly memberRegistrationService: MemberRegistrationService,
        private readonly memberAuthService: MemberAuthService
    ) {}

    async execute(
        dto: DynamicMemberRegistrationDto,
        portalId: string | undefined
    ): Promise<RegisterMemberResponseDto> {
        const result = await this.memberRegistrationService.register({
            email: dto.email,
            password: dto.password,
            fields: dto.fields,
            portalId,
        });

        const deviceId = randomUUID();
        const tokens = await this.memberAuthService.generateTokens(
            { id: result.userId, email: result.email },
            deviceId
        );

        return {
            ...tokens,
            user: {
                id: result.userId,
                email: result.email,
            },
            claimed: result.claimed,
            memberId: result.memberId,
        };
    }
}
