import { ApiProperty } from "@nestjs/swagger";

export class PasswordResetResponseDto {
    @ApiProperty({ example: true, type: Boolean })
    success: boolean;

    @ApiProperty({ example: "Password reset successfully", type: String })
    message: string;
}
