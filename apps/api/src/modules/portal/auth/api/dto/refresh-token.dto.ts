import { ApiProperty } from "@nestjs/swagger";

import { IsString, MinLength } from "class-validator";

/** Нативный клиент: refresh-токен в теле (веб держит его в HttpOnly-куке и тело не шлёт). */
export class RefreshTokenDto {
    @ApiProperty({
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        description: "Refresh token из ответа входа или прошлого refresh",
        type: String,
    })
    @IsString()
    @MinLength(1)
    refreshToken: string;
}
