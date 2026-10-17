import { SetMetadata } from "@nestjs/common";

/**
 * Ключ для метаданных публичного эндпоинта
 */
export const IS_PUBLIC_KEY = "isPublic";

/**
 * Публичный эндпоинт: сессия не нужна. Маршрут без `@Public()` обязан стоять под `CrmSession`/`CrmAuth`/
 * `CabinetSession`/`CabinetAuth` или гвардом платформы.
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
