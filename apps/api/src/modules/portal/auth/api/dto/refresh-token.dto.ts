import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsString } from "class-validator";

export class RefreshTokenDto {
    @ApiPropertyOptional({
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        description: "Refresh token (optional when using HttpOnly cookie)",
        type: String,
    })
    @IsOptional()
    @IsString()
    refreshToken?: string;
}
