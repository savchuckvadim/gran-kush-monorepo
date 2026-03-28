import { SetMetadata } from "@nestjs/common";

/**
 * Ключ для метаданных публичного эндпоинта
 */
export const IS_PUBLIC_KEY = "isPublic";

/**
 * Декоратор для пометки публичных эндпоинтов (не требующих аутентификации)
 * Используется вместе с guard’ами Passport (@RequireEmployeeJwt / @RequireMemberJwt и т.д.)
 *
 * @example
 * ```typescript
 * @Post('register')
 * @Public()
 * async register(@Body() dto: RegisterDto) {
 *   return this.authService.register(dto);
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
