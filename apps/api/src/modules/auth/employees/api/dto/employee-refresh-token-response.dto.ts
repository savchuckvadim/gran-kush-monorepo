import { ApiProperty } from "@nestjs/swagger";

export class EmployeeRefreshTokenResponseDto {
    @ApiProperty({
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        description: "New access token",
        type: String,
    })
    accessToken: string;

    @ApiProperty({
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        description: "New refresh token",
        type: String,
    })
    refreshToken: string;
}
