import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisteredUserInfoDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;

    @ApiProperty({ example: "user@example.com", type: String })
    email: string;
}

export class RegisterMemberResponseDto {
    @ApiProperty({ type: () => RegisteredUserInfoDto })
    user: RegisteredUserInfoDto;

    @ApiProperty({
        example: true,
        type: Boolean,
        description: "Сессии нет: войти можно после подтверждения почты по ссылке из письма",
    })
    awaitingEmailConfirmation: boolean;

    @ApiPropertyOptional({
        example: "123e4567-e89b-12d3-a456-426614174999",
        type: String,
        description: "Мост member, если регистрация шла в контексте портала",
    })
    memberId?: string;
}
