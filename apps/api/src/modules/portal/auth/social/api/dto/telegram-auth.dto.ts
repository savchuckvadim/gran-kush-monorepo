import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Matches, MaxLength } from "class-validator";

import { IsEmailWithLowerCase } from "@common/decorators/dto/is-email-with-lower-case.decorator";

/*
 * Поля ответа виджета Telegram Login называются так, как их присылает Telegram (snake_case):
 * подпись считается по этим именам, переименовать их нельзя.
 */
export class TelegramAuthDto {
    @ApiProperty({ type: Number, example: 123456789 })
    @Type(() => Number)
    @IsInt()
    id: number;

    @ApiProperty({ type: String, example: "Ana" })
    @IsString()
    @MaxLength(256)
    first_name: string;

    @ApiPropertyOptional({ type: String, example: "López" })
    @IsOptional()
    @IsString()
    @MaxLength(256)
    last_name?: string;

    @ApiPropertyOptional({ type: String, example: "ana_lopez" })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    username?: string;

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    @MaxLength(512)
    photo_url?: string;

    @ApiProperty({ type: Number, example: 1760000000, description: "Unix time входа в Telegram" })
    @Type(() => Number)
    @IsInt()
    auth_date: number;

    @ApiProperty({ type: String, description: "Подпись Telegram, hex" })
    @IsString()
    @Matches(/^[a-f0-9]{64}$/)
    hash: string;
}

export class TelegramConfigDto {
    @ApiProperty({ type: Boolean, description: "Бот настроен — показывать кнопку Telegram" })
    enabled: boolean;

    @ApiProperty({ type: String, nullable: true, example: "pafpaf_bot" })
    botUsername: string | null;

    @ApiProperty({
        type: Number,
        nullable: true,
        example: 123456789,
        description: "Числовой id бота — для окна входа Telegram (`Telegram.Login.auth`)",
    })
    botId: number | null;
}

export class TelegramSignInResultDto {
    @ApiProperty({
        enum: ["signed_in", "email_required"],
        description: "email_required — Telegram ещё не привязан: нужен шаг «укажите почту»",
    })
    status: "signed_in" | "email_required";

    @ApiPropertyOptional({ type: String, description: "Билет шага «укажите почту», 30 минут" })
    ticket?: string;
}

export class TelegramEmailDto {
    @ApiProperty({ type: String })
    @IsString()
    @MaxLength(4096)
    ticket: string;

    @ApiProperty({ type: String, example: "ana@example.com" })
    @IsEmailWithLowerCase()
    email: string;
}

export class TelegramConfirmDto {
    @ApiProperty({ type: String, description: "Токен из ссылки в письме" })
    @IsString()
    @MaxLength(4096)
    token: string;
}

export class TelegramStatusDto {
    @ApiProperty({ enum: ["signed_in", "email_sent"] })
    status: "signed_in" | "email_sent";
}
