import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@mail/consts/mail.constants";
import { Equals, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

import { IsNotReservedPortalSlug } from "@common/portal/reserved-slugs";
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
    @IsNotReservedPortalSlug()
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

    @ApiPropertyOptional({
        example: "club-month",
        description:
            "Billing plan code chosen on the product site (?plan=). Unknown or inactive codes fall back to the trial plan",
        type: String,
    })
    @IsOptional()
    @IsString()
    @MaxLength(40)
    @Matches(/^[a-z0-9-]+$/)
    planCode?: string;

    @ApiPropertyOptional({
        enum: SUPPORTED_LANGUAGES,
        example: "es",
        description: "Language of the welcome and email confirmation letters",
    })
    @IsOptional()
    @IsIn(SUPPORTED_LANGUAGES)
    locale?: SupportedLanguage;

    @ApiProperty({
        example: true,
        description:
            "The owner accepts the Terms and conditions and the Data processing agreement and has read the Privacy policy. Must be true",
        type: Boolean,
    })
    @Equals(true, {
        message: "acceptTerms must be true: accept the Terms and the Data processing agreement",
    })
    acceptTerms: boolean;
}
