import { ApiProperty } from "@nestjs/swagger";

export class VerifyEmailResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: "Email confirmed successfully" })
    message: string;
}
