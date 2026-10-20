import { ApiPropertyOptional, IntersectionType } from "@nestjs/swagger";

import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

import { IsQueryBoolean } from "@common/decorators/dto/query-boolean.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";

// ─── Filter DTO ──────────────────────────────────────────────────────────────

export class ProductFilterDto {
    @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ example: true, type: Boolean })
    @IsOptional()
    @IsQueryBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: true, type: Boolean })
    @IsOptional()
    @IsQueryBoolean()
    isAvailable?: boolean;

    @ApiPropertyOptional({
        example: false,
        type: Boolean,
        description: "false — без расходников (подбор товара в заказ)",
    })
    @IsOptional()
    @IsQueryBoolean()
    isConsumable?: boolean;

    @ApiPropertyOptional({
        example: "Producto A",
        type: String,
        description: "Поиск по name, sku, strain, коду этикетки и штрихкоду",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ example: 5.0, type: Number, description: "Минимальная цена" })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @ApiPropertyOptional({ example: 100.0, type: Number, description: "Максимальная цена" })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxPrice?: number;
}

/** Один `@Query()` DTO на хендлер: два DTO на одном query несовместимы с forbidNonWhitelisted */
export class ProductListQueryDto extends IntersectionType(PaginationDto, ProductFilterDto) {}
