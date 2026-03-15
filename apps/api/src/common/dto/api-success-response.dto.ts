import { ApiProperty } from "@nestjs/swagger";

/**
 * Базовый DTO для успешного ответа API
 * Оборачивает данные в объект { result: ... }
 * Используется ResponseInterceptor для автоматической обертки
 */
export class ApiSuccessResponseDto<T = any> {
    @ApiProperty({
        description: "Response data",
    })
    result: T;
}
