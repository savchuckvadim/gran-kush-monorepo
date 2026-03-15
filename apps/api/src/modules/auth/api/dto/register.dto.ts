import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class RegisterDto {
    @ApiProperty({ example: "user@example.com" })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({
        example: "Password123",
        description: "Password must contain uppercase, lowercase and number",
    })
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: "Password must contain uppercase, lowercase and number",
    })
    password: string;

    @ApiProperty({ example: "John Doe" })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ example: "+1234567890" })
    @IsString()
    @IsOptional()
    @Matches(/^\+?[1-9]\d{1,14}$/)
    phone?: string;
}
