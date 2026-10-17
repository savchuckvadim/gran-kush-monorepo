import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

import { IDENTITY_PROVIDER_KEYS, type IdentityProviderKey } from "../../domain/identity-provider";

const PROVIDER_KEYS = Object.values(IDENTITY_PROVIDER_KEYS);
const TOKEN_MAX = 4096;

export class IdentityProviderDto {
    @ApiProperty({ enum: PROVIDER_KEYS })
    key: IdentityProviderKey;

    @ApiProperty({
        enum: ["redirect", "widget"],
        description:
            "redirect — кнопка ведёт на `start`; widget — окно провайдера, ответ на `verify`",
    })
    flow: "redirect" | "widget";

    @ApiProperty({
        type: "object",
        additionalProperties: {
            oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
        },
        description: "Публичные параметры кнопки: у Telegram — `botUsername`, `botId`",
    })
    config: Record<string, string | number | boolean | null>;
}

export class IdentityProvidersResponseDto {
    @ApiProperty({ type: () => [IdentityProviderDto] })
    providers: IdentityProviderDto[];
}

export class IdentityStartQueryDto {
    @ApiPropertyOptional({ enum: ["ru", "en", "es"] })
    @IsOptional()
    @IsString()
    @MaxLength(8)
    locale?: string;

    @ApiPropertyOptional({
        description: "Путь фронта, куда вернуть после входа (только относительный)",
    })
    @IsOptional()
    @IsString()
    @MaxLength(512)
    returnTo?: string;

    @ApiPropertyOptional({
        enum: ["invitation", "club_signup"],
        description:
            "CRM: invitation — принять приглашение (нужен token); club_signup — завести клуб",
    })
    @IsOptional()
    @IsIn(["invitation", "club_signup"])
    intent?: "invitation" | "club_signup";

    @ApiPropertyOptional({ description: "Токен приглашения для intent=invitation" })
    @IsOptional()
    @IsString()
    @MaxLength(256)
    token?: string;
}

export class IdentityLinkQueryDto {
    @ApiPropertyOptional({ enum: ["ru", "en", "es"] })
    @IsOptional()
    @IsString()
    @MaxLength(8)
    locale?: string;
}

export class IdentityVerifyDto {
    @ApiProperty({
        type: "object",
        additionalProperties: true,
        description:
            "Ответ виджета провайдера как есть (у Telegram — поля Telegram Login с `hash`)",
    })
    @IsObject()
    payload: Record<string, unknown>;
}

export class IdentitySignInResultDto {
    @ApiProperty({
        enum: ["signed_in", "email_required"],
        description: "email_required — способ ещё не привязан и почты нет: шаг «укажите почту»",
    })
    status: "signed_in" | "email_required";

    @ApiPropertyOptional({ type: String, description: "Билет шага «укажите почту», 30 минут" })
    ticket?: string;
}

export class IdentityEmailDto {
    @ApiProperty({ type: String })
    @IsString()
    @MaxLength(TOKEN_MAX)
    ticket: string;

    @ApiProperty({ type: String, example: "ana@example.com" })
    @IsEmailWithLowerCase()
    email: string;
}

export class IdentityConfirmDto {
    @ApiProperty({ type: String, description: "Токен из ссылки в письме" })
    @IsString()
    @MaxLength(TOKEN_MAX)
    token: string;
}

export class IdentityStatusDto {
    @ApiProperty({ enum: ["signed_in", "email_sent"] })
    status: "signed_in" | "email_sent";
}
