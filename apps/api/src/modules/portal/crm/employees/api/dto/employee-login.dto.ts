import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsString, MinLength } from "class-validator";

export class EmployeeLoginDto {
    @ApiProperty({ example: "employee@example.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "password123", minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;
}
