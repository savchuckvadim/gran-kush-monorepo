import { Injectable } from "@nestjs/common";

import type { SupportedLanguage } from "@mail/consts/mail.constants";

import { RegisterMemberResponseDto } from "@modules/portal/auth/members/api/dto/register-member-response.dto";
import { MemberRegistrationService } from "@modules/portal/auth/members/application/services/member-registration.service";
import { DynamicMemberRegistrationDto } from "@modules/portal/crm/members/api/dto/dynamic-member.dto";

@Injectable()
export class MemberRegistrationUseCase {
    constructor(private readonly memberRegistrationService: MemberRegistrationService) {}

    /** Сессии нет до подтверждения почты: вход — после ссылки из письма (TASK-664). */
    async execute(
        dto: DynamicMemberRegistrationDto,
        portalId: string | undefined,
        language: SupportedLanguage
    ): Promise<RegisterMemberResponseDto> {
        const result = await this.memberRegistrationService.register({
            email: dto.email,
            password: dto.password,
            fields: dto.fields,
            files: dto.files,
            portalId,
            language,
        });

        return { email: result.email, awaitingEmailConfirmation: true };
    }
}
