import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsObject, IsOptional, IsString, Matches, MinLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

/** Учётные данные глобального аккаунта. */
export class DynamicMemberCredentialsDto {
    @ApiProperty({ example: "user@example.com", type: String })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({
        example: "Password123",
        description: "Password must contain uppercase, lowercase and number",
        type: String,
    })
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: "Password must contain uppercase, lowercase and number",
    })
    password: string;
}

export class DynamicMemberRegistrationDto extends DynamicMemberCredentialsDto {
    @ApiPropertyOptional({
        description:
            "Field values keyed by fieldKey (see registration-schema). Обязательны только при регистрации в контексте портала",
        type: "object",
        additionalProperties: true,
        example: { first_name: "John", last_name: "Doe" },
    })
    @IsOptional()
    @IsObject()
    fields?: Record<string, unknown>;
}

/**
 * CRM: сотрудник создаёт member по email (без пароля).
 * Если аккаунта нет — он создаётся в статусе pending_claim,
 * пользователь позже клеймит его при регистрации.
 */
export class CrmCreateMemberDto {
    @ApiProperty({ example: "user@example.com", type: String })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({
        description: "Field values keyed by fieldKey",
        type: "object",
        additionalProperties: true,
    })
    @IsObject()
    fields: Record<string, unknown>;
}

export class CrmCreateMemberResponseDto {
    @ApiProperty({ type: String })
    userId: string;

    @ApiProperty({ type: String })
    memberId: string;

    @ApiProperty({
        type: Boolean,
        description: "true если аккаунт создан сейчас и ждёт клейма",
    })
    isNewUser: boolean;
}
