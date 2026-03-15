import { applyDecorators } from "@nestjs/common";

import { Transform } from "class-transformer";
import { IsEmail, ValidationOptions } from "class-validator";

/**
 * Декоратор для валидации email с автоматическим приведением к нижнему регистру
 * Комбинирует валидацию @IsEmail() и трансформацию @Transform()
 *
 * @param options - Опции валидации для @IsEmail()
 * @returns Декоратор, который валидирует и трансформирует email
 *
 * @example
 * ```typescript
 * class CreateUserDto {
 *   @IsEmailWithLowerCase()
 *   email: string;
 * }
 * ```
 */
export function IsEmailWithLowerCase(
    options?: ValidationOptions & {
        allow_display_name?: boolean;
        require_tld?: boolean;
    }
) {
    return applyDecorators(
        // Трансформация: приводим email к нижнему регистру
        Transform(({ value }): string => {
            if (typeof value === "string") {
                return value.toLowerCase().trim();
            }
            return String(value);
        }),
        // Валидация: проверяем, что это валидный email
        IsEmail(options)
    );
}
