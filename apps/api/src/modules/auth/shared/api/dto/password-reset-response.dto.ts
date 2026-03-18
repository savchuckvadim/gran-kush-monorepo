import { ApiProperty } from "@nestjs/swagger";

export class PasswordResetResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: "Password reset successfully" })
    message: string;
}
