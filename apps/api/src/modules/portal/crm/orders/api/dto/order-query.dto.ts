import { ApiProperty, ApiPropertyOptional, IntersectionType, PickType } from "@nestjs/swagger";

import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { OrderStatus, PaymentStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";

// ═══════════════════════════════════════════════════════════════════════════════
// Order Filters (Query)
// ═══════════════════════════════════════════════════════════════════════════════

export class OrderFilterDto {
    @ApiPropertyOptional({
        enum: OrderStatus,
        example: OrderStatus.PENDING,
    })
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "Стадия воронки (колонка канбана)",
    })
    @IsOptional()
    @IsUUID()
    stageId?: string;

    @ApiPropertyOptional({
        enum: PaymentStatus,
        example: PaymentStatus.PENDING,
    })
    @IsOptional()
    @IsEnum(PaymentStatus)
    paymentStatus?: PaymentStatus;

    @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    @IsOptional()
    @IsUUID()
    memberId?: string;

    @ApiPropertyOptional({
        example: "ORD-2026",
        type: String,
        description: "Поиск по номеру заказа",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        example: "2026-03-01T00:00:00.000Z",
        type: String,
        description: "Начало периода",
    })
    @IsOptional()
    @Type(() => Date)
    startDate?: Date;

    @ApiPropertyOptional({
        example: "2026-03-31T23:59:59.000Z",
        type: String,
        description: "Конец периода",
    })
    @IsOptional()
    @Type(() => Date)
    endDate?: Date;
}

/** Один `@Query()` DTO на хендлер: два DTO на одном query несовместимы с forbidNonWhitelisted */
export class OrderListQueryDto extends IntersectionType(PaginationDto, OrderFilterDto) {}

// ═══════════════════════════════════════════════════════════════════════════════
// Stage Summary (CRM kanban)
// ═══════════════════════════════════════════════════════════════════════════════

class OrderFunnelRefDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "Воронка заказов (stage category)",
    })
    @IsUUID()
    categoryId: string;
}

/** Фильтры списка без стадии и статуса: колонки канбана и есть стадии */
export class OrderStageSummaryQueryDto extends IntersectionType(
    OrderFunnelRefDto,
    PickType(OrderFilterDto, [
        "paymentStatus",
        "memberId",
        "search",
        "startDate",
        "endDate",
    ] as const)
) {}

export class OrderStageSummaryItemDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    stageId: string;

    @ApiProperty({ example: 12, type: Number })
    count: number;

    @ApiProperty({ example: 373.5, type: Number, description: "Сумма заказов стадии, €" })
    total: number;
}

export class OrderStageSummaryDto {
    @ApiProperty({ type: () => [OrderStageSummaryItemDto] })
    stages: OrderStageSummaryItemDto[];
}
