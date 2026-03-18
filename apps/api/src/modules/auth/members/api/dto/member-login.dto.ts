import { ApiProperty } from "@nestjs/swagger";

import { IsString } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class MemberLoginDto {
    @ApiProperty({ example: "user@example.com" })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({ example: "Password123" })
    @IsString()
    password: string;
}
