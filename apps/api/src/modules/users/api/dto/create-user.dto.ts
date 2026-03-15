import { ApiProperty } from "@nestjs/swagger";

import { IsString, MinLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class CreateUserDto {
    @ApiProperty({ example: "user@example.com" })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({ example: "password123", minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;
}
