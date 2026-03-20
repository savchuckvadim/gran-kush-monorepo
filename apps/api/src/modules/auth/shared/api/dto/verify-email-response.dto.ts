import { ApiProperty } from "@nestjs/swagger";

export class VerifyEmailResponseDto {
    @ApiProperty({ example: true, type: Boolean })
    success: boolean;

    @ApiProperty({ example: "Email confirmed successfully", type: String })
    message: string;
}
