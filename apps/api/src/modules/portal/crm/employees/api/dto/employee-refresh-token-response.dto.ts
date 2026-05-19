import { ApiProperty } from "@nestjs/swagger";

export class EmployeeRefreshTokenResponseDto {
    @ApiProperty({
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        description: "New access token",
    })
    accessToken: string;

    @ApiProperty({
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        description: "New refresh token",
    })
    refreshToken: string;
}
