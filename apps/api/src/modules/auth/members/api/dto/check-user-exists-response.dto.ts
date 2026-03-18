import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CheckUserExistsResponseDto {
    @ApiProperty({ example: true })
    exists: boolean;

    @ApiPropertyOptional({ example: true })
    hasEmployee?: boolean;

    @ApiPropertyOptional({ example: true })
    hasMember?: boolean;

    @ApiPropertyOptional({
        example: "User already registered as Employee. Do you want to register as Member?",
    })
    message?: string;
}
