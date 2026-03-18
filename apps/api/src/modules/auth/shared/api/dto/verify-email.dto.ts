import { ApiProperty } from "@nestjs/swagger";

import { IsString } from "class-validator";

export class VerifyEmailDto {
    @ApiProperty({
        example: "abc123def456...",
        description: "Email verification token from email",
    })
    @IsString()
    token: string;
}
