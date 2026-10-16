import { ApiProperty } from "@nestjs/swagger";

import { IsString, Matches, MinLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

import { CreateClubDto } from "./create-club.dto";

/** Registration from the product site: a new account (email + password) and its first club. */
export class RegisterPortalDto extends CreateClubDto {
    @ApiProperty({ example: "owner@greenclub.com", type: String })
    @IsEmailWithLowerCase()
    email: string;

    @ApiProperty({
        example: "StrongPassword123",
        description: "Password must contain uppercase, lowercase and number",
        type: String,
    })
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: "Password must contain uppercase, lowercase and number",
    })
    password: string;
}
