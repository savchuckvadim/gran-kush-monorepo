import { ApiProperty } from "@nestjs/swagger";

export class ResendEmailConfirmationResponseDto {
    @ApiProperty({ example: true, type: Boolean })
    success: boolean;

    @ApiProperty({ example: "Confirmation email sent", type: String })
    message: string;
}
