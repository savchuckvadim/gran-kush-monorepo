import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CheckUserExistsResponseDto {
    @ApiProperty({ example: true, type: Boolean })
    exists: boolean;

    @ApiPropertyOptional({ example: true, type: Boolean })
    hasEmployee?: boolean;

    @ApiPropertyOptional({ example: true, type: Boolean })
    hasMember?: boolean;

    @ApiPropertyOptional({
        example: "User already registered as Employee. Do you want to register as Member?",
        type: String,
    })
    message?: string;
}
