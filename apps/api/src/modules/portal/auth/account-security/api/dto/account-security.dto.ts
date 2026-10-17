import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsString, MaxLength } from "class-validator";

import { IsAccountPassword, PASSWORD_MAX_LENGTH } from "@common/decorators/dto/password.decorator";
import {
    IDENTITY_PROVIDER_KEYS,
    type IdentityProviderKey,
} from "@modules/portal/auth/identity/domain/identity-provider";

export class SignInMethodDto {
    @ApiProperty({ enum: Object.values(IDENTITY_PROVIDER_KEYS) })
    provider: IdentityProviderKey;

    @ApiProperty({
        enum: ["redirect", "widget"],
        description:
            "redirect — привязка через `GET /{aud}/auth/{provider}/link`; widget — `POST …/security/{provider}`",
    })
    flow: "redirect" | "widget";

    @ApiProperty({ description: "Провайдер настроен в этом приложении: можно привязать" })
    available: boolean;

    @ApiProperty()
    linked: boolean;

    @ApiProperty({ type: String, nullable: true, example: "ana@gmail.com" })
    email: string | null;

    @ApiProperty({ type: String, nullable: true, example: "ana_lopez" })
    username: string | null;
}

/** Способы входа аккаунта: пароль и провайдеры. */
export class AccountSecurityDto {
    @ApiProperty({ type: String, example: "ana@example.com" })
    email: string;

    @ApiProperty({
        type: Boolean,
        description: "Пароль задан; аккаунт с провайдером может войти и без него",
    })
    hasPassword: boolean;

    @ApiProperty({ type: () => [SignInMethodDto] })
    methods: SignInMethodDto[];
}

export class ChangeAccountPasswordDto {
    @ApiPropertyOptional({
        type: String,
        description: "Текущий пароль; не нужен, если пароля ещё нет (вход только через провайдера)",
    })
    @IsOptional()
    @IsString()
    @MaxLength(PASSWORD_MAX_LENGTH)
    currentPassword?: string;

    @ApiProperty({ type: String, example: "NewPassword123" })
    @IsAccountPassword()
    newPassword: string;
}
