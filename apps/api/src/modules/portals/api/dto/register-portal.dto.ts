import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class RegisterPortalDto {
    @ApiProperty({
        example: "green-club",
        description: "Unique portal slug. Allowed chars: a-z, 0-9, dash",
        type: String,
    })
    @IsString()
    @MinLength(3)
    @MaxLength(40)
    @Matches(/^[a-z0-9-]+$/)
    name: string;

    @ApiProperty({ example: "Green Club", type: String })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    displayName: string;

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

    @ApiProperty({ example: "Owner", type: String })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    ownerName: string;

    @ApiPropertyOptional({ example: "Surname", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    ownerSurname?: string;
}
