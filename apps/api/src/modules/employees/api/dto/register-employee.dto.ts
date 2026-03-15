import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class RegisterEmployeeDto {
    @ApiProperty({ example: "employee@example.com" })
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

    @ApiProperty({ example: "John" })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ example: "Doe" })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    surname?: string;

    @ApiPropertyOptional({ example: "+1234567890" })
    @IsString()
    @IsOptional()
    @Matches(/^\+?[1-9]\d{1,14}$/)
    phone?: string;

    @ApiPropertyOptional({ example: "manager", enum: ["employee", "manager", "admin"] })
    @IsString()
    @IsOptional()
    role?: string;

    @ApiPropertyOptional({ example: "Senior Manager" })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    position?: string;

    @ApiPropertyOptional({ example: "Sales" })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    department?: string;
}
