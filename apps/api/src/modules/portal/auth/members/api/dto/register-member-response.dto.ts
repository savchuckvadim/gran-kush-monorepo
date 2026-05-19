import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisteredUserInfoDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;

    @ApiProperty({ example: "user@example.com", type: String })
    email: string;

    @ApiProperty({ example: "John", type: String })
    name: string;

    @ApiPropertyOptional({ example: "Doe", type: String })
    surname?: string;
}

export class RegistrationWarningDto {
    @ApiProperty({
        example: "User already exists as Employee. Do you want to register as Member?",
        type: String,
    })
    message: string;

    @ApiProperty({ example: true, type: Boolean })
    hasEmployee: boolean;
}

export class RegisterMemberResponseDto {
    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: String })
    accessToken: string;

    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: String })
    refreshToken: string;

    @ApiProperty({
        example: "123e4567-e89b-12d3-a456-426614174999",
        type: String,
        description: "Created member identifier",
    })
    memberId: string;

    @ApiProperty({ type: () => RegisteredUserInfoDto })
    user: RegisteredUserInfoDto;

    @ApiPropertyOptional({ type: () => RegistrationWarningDto })
    warning?: RegistrationWarningDto;
}
