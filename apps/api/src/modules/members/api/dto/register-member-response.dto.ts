import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterMemberResponseDto {
    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
    accessToken: string;

    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
    refreshToken: string;

    @ApiProperty({
        example: "123e4567-e89b-12d3-a456-426614174999",
        description: "Created member identifier",
    })
    memberId: string;

    @ApiProperty({
        example: {
            id: "123e4567-e89b-12d3-a456-426614174000",
            email: "user@example.com",
            name: "John",
            surname: "Doe",
        },
    })
    user: {
        id: string;
        email: string;
        name: string;
        surname?: string;
    };

    @ApiPropertyOptional({
        example: {
            message: "User already exists as Employee. Do you want to register as Member?",
            hasEmployee: true,
        },
    })
    warning?: {
        message: string;
        hasEmployee: boolean;
    };
}
