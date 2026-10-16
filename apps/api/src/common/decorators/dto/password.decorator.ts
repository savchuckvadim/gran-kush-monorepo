import { applyDecorators } from "@nestjs/common";

import { IsString, Matches, MaxLength, MinLength } from "class-validator";

/** Пароль аккаунта: от 8 символов, строчная, заглавная и цифра — то же правило, что при регистрации. */
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

/** bcrypt учитывает только первые 72 байта: длиннее пароль молча совпал бы с обрезанным. */
export const PASSWORD_MAX_LENGTH = 72;

export const IsAccountPassword = () =>
    applyDecorators(
        IsString(),
        MinLength(8),
        MaxLength(PASSWORD_MAX_LENGTH),
        Matches(PASSWORD_RULE, { message: "Password must contain uppercase, lowercase and number" })
    );
