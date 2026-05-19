import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsString } from "class-validator";

export class MemberConfirmEmailDto {
    @ApiProperty({
        example: "abc123def456...",
        description: "Email verification token from email",
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    token: string;
}

export class MemberConfirmEmailResponseDto {
    @ApiProperty({ example: true, description: "Email confirmed successfully", type: Boolean })
    success: boolean;
    @ApiProperty({
        example: "Email confirmed successfully",
        description: "Email confirmed successfully",
        type: String,
    })
    message: string;
}
