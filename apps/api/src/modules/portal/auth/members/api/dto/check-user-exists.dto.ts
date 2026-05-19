import { ApiProperty } from "@nestjs/swagger";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class CheckUserExistsDto {
    @ApiProperty({ example: "user@example.com", type: String })
    @IsEmailWithLowerCase()
    email: string;
}
