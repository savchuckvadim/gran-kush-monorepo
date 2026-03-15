import { ApiProperty } from "@nestjs/swagger";

export class AuthResponseDto {
    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
    accessToken: string;

    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
    refreshToken: string;

    @ApiProperty({
        example: {
            id: "507f1f77bcf86cd799439011",
            email: "user@example.com",
        },
    })
    user: {
        id: string;
        email: string;
    };
}
