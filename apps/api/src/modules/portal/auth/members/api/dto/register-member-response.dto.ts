import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisteredUserInfoDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;

    @ApiProperty({ example: "user@example.com", type: String })
    email: string;
}

export class RegisterMemberResponseDto {
    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: String })
    accessToken: string;

    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: String })
    refreshToken: string;

    @ApiProperty({ type: () => RegisteredUserInfoDto })
    user: RegisteredUserInfoDto;

    @ApiProperty({
        example: false,
        type: Boolean,
        description: "true если pending_claim аккаунт был заклеймлен этим запросом",
    })
    claimed: boolean;

    @ApiPropertyOptional({
        example: "123e4567-e89b-12d3-a456-426614174999",
        type: String,
        description: "Мост member, если регистрация шла в контексте портала",
    })
    memberId?: string;
}
