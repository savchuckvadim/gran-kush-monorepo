import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsEmail, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class CreateUserDto {
    @ApiProperty({ example: "user@example.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "password123", minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ example: "John Doe", minLength: 2 })
    @IsString()
    @MinLength(2)
    name: string;

    @ApiPropertyOptional({ example: "+1234567890" })
    @IsString()
    @IsOptional()
    @Matches(/^\+?[1-9]\d{1,14}$/)
    phone?: string;
}
