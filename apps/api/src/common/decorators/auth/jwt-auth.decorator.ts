import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";

import { JwtAuthGuard } from "@auth/infrastructure/guards/jwt-auth.guard";

/**
 * Декоратор для защиты роутов JWT аутентификацией
 * Комбинирует @UseGuards(JwtAuthGuard) и @ApiBearerAuth() для Swagger
 *
 * @example
 * ```typescript
 * @Get()
 * @JwtAuth()
 * async findAll() {
 *   return this.service.findAll();
 * }
 * ```
 */
export const JwtAuth = () => {
    return applyDecorators(UseGuards(JwtAuthGuard), ApiBearerAuth());
};
