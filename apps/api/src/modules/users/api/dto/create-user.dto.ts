import { ApiProperty } from "@nestjs/swagger";

import { IsString, MinLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class CreateUserDto {
    @ApiProperty({ type: String, example: "user@example.com" })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({ type: String, example: "password123", minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;
}
