import { z } from "zod";

import {
    PASSWORD_CHARACTERS,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
} from "@/modules/shared/config/password-policy";

/**
 * Поле нового пароля для форм на zod: правило из `password-policy`. `length` — текст про длину,
 * `characters` — про строчную, заглавную и цифру; у формы с одним текстом это одна строка.
 */
export const passwordSchema = (messages: { length: string; characters: string }) =>
    z
        .string()
        .min(PASSWORD_MIN_LENGTH, messages.length)
        .max(PASSWORD_MAX_LENGTH, messages.length)
        .regex(PASSWORD_CHARACTERS, messages.characters);
