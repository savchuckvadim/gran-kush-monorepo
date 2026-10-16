import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsString, MaxLength } from "class-validator";

import { IsAccountPassword, PASSWORD_MAX_LENGTH } from "@common/decorators/dto/password.decorator";

export class GoogleSignInDto {
    @ApiProperty({ type: Boolean })
    linked: boolean;

    @ApiProperty({ type: String, nullable: true, example: "ana@gmail.com" })
    email: string | null;
}

export class TelegramSignInDto {
    @ApiProperty({ type: Boolean })
    linked: boolean;

    @ApiProperty({ type: String, nullable: true, example: "ana_lopez" })
    username: string | null;
}

/** Способы входа аккаунта: пароль, Google, Telegram. */
export class AccountSecurityDto {
    @ApiProperty({ type: String, example: "ana@example.com" })
    email: string;

    @ApiProperty({
        type: Boolean,
        description: "Пароль задан; Google-аккаунт может войти и без него",
    })
    hasPassword: boolean;

    @ApiProperty({ type: () => GoogleSignInDto })
    google: GoogleSignInDto;

    @ApiProperty({ type: () => TelegramSignInDto })
    telegram: TelegramSignInDto;
}

export class ChangeAccountPasswordDto {
    @ApiPropertyOptional({
        type: String,
        description: "Текущий пароль; не нужен, если пароля ещё нет (вход только через Google)",
    })
    @IsOptional()
    @IsString()
    @MaxLength(PASSWORD_MAX_LENGTH)
    currentPassword?: string;

    @ApiProperty({ type: String, example: "NewPassword123" })
    @IsAccountPassword()
    newPassword: string;
}
