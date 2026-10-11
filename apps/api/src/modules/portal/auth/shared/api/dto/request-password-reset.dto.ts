import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@mail/consts/mail.constants";
import { IsIn, IsOptional } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

export class RequestPasswordResetDto {
    @ApiProperty({ example: "user@example.com", type: String })
    @IsEmailWithLowerCase()
    email: string;

    @ApiPropertyOptional({
        enum: SUPPORTED_LANGUAGES,
        example: "es",
        description: "Language of the email and of the page the link opens",
    })
    @IsOptional()
    @IsIn(SUPPORTED_LANGUAGES)
    locale?: SupportedLanguage;
}
