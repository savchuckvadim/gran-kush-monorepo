import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@mail/consts/mail.constants";
import { IsIn, IsOptional } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

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

/** Публичный вариант: без сессии, по email. Ответ не выдаёт, существует ли адрес. */
export class ResendEmailConfirmationPublicDto extends ResendEmailConfirmationDto {
    @ApiProperty({ type: String, example: "user@example.com" })
    @IsEmailWithLowerCase()
    email: string;
}
