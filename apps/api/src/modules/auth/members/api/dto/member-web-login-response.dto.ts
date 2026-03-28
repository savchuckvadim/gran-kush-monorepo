import { ApiProperty } from "@nestjs/swagger";

import { MemberUserInfoDto } from "@auth/members/api/dto/member-auth-response.dto";

/** Веб ЛК: токены только в HttpOnly cookies; в теле — user и device id. */
export class MemberWebLoginResponseDto {
    @ApiProperty({ type: () => MemberUserInfoDto })
    user: MemberUserInfoDto;

    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        description: "Сохраните и передавайте в заголовке X-Device-Id при следующих запросах",
    })
    deviceId: string;
}
