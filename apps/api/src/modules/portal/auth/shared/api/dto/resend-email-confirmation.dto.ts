import { ApiPropertyOptional } from "@nestjs/swagger";

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@mail/consts/mail.constants";
import { IsIn, IsOptional } from "class-validator";

export class ResendEmailConfirmationDto {
    @ApiPropertyOptional({
        enum: SUPPORTED_LANGUAGES,
        example: "es",
        description: "Language of the email and of the page the link opens",
    })
    @IsOptional()
    @IsIn(SUPPORTED_LANGUAGES)
    locale?: SupportedLanguage;
}
