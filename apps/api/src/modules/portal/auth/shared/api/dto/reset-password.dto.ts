import { ApiProperty } from "@nestjs/swagger";

import { IsString, Matches, MinLength } from "class-validator";

export class ResetPasswordDto {
    @ApiProperty({
        example: "abc123def456...",
        description: "Password reset token from email",
    })
    @IsString()
    token: string;

    @ApiProperty({
        example: "NewPassword123",
        description: "New password (must contain uppercase, lowercase and number)",
    })
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: "Password must contain uppercase, lowercase and number",
    })
    newPassword: string;
}
