import { ApiProperty } from "@nestjs/swagger";

import { IsEmail } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class RequestPasswordResetDto {
    @ApiProperty({ example: "user@example.com", type: String })
    @IsEmailWithLowerCase()
    email: string;
}
