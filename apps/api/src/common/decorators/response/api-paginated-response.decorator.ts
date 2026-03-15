import { Type } from "@nestjs/common";
import { ApiOkResponse, ApiProperty } from "@nestjs/swagger";

/**
 * Упрощенный декоратор для документирования пагинированных ответов API
 * Документирует только тип данных, ResponseInterceptor автоматически обернет в { result: T }
 *
 * @param model - DTO класс для элементов списка
 * @param options - Опции (description)
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(
    model: TModel,
    options?: {
        description?: string;
    }
) => {
    const description = options?.description || "Paginated response";

    // Используем простой класс без динамического создания
    class PaginatedResponseClass {
        @ApiProperty({
            type: () => [model],
            description: "Array of items",
        })
        items: TModel[];

        @ApiProperty({ example: 100, description: "Total number of items" })
        total: number;

        @ApiProperty({ example: 1, description: "Current page number" })
        page: number;

        @ApiProperty({ example: 10, description: "Items per page" })
        limit: number;

        @ApiProperty({ example: 10, description: "Total number of pages" })
        totalPages: number;
    }

    // Присваиваем уникальное имя для Swagger
    Object.defineProperty(PaginatedResponseClass, "name", {
        value: `PaginatedResponse_${model.name}`,
        writable: false,
    });

    return ApiOkResponse({
        description,
        type: PaginatedResponseClass,
    });
};
