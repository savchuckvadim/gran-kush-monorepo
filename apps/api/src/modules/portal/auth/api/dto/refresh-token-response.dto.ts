import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsString } from "class-validator";

export class RefreshTokenDto {
    @ApiProperty({
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        description: "New refresh token",
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

export class RefreshTokenResponseDto {
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
