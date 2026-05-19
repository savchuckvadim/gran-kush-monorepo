import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsString, MinLength } from "class-validator";

export class EmployeeLoginDto {
    @ApiProperty({ example: "employee@example.com", type: String })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "password123", minLength: 8, type: String })
    @IsString()
    @MinLength(8)
    password: string;
}
