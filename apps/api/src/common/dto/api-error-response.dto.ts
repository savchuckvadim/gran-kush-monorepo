import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO для ошибок API
 * Используется в GlobalExceptionFilter
 */
export class ApiErrorResponseDto {
    // @ApiProperty({
    //     example: null,
    //     description: 'Result is always null for errors',
    //     nullable: true,
    // })
    // result: null;

    @ApiProperty({
        example: "Validation failed",
        description: "Error message",
    })
    message: string;

    @ApiPropertyOptional({
        example: ["email must be an email", "password must be longer than 8 characters"],
        description: "Array of validation errors (for validation errors)",
        type: [String],
    })
    errors?: string[];
}
