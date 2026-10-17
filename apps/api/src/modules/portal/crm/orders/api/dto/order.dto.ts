import { ApiProperty, ApiPropertyOptional, IntersectionType, PickType } from "@nestjs/swagger";

import { StageSemantic } from "@prisma/client";
import { Type } from "class-transformer";
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from "class-validator";

import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { OrderStatus, PaymentStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";

// ═══════════════════════════════════════════════════════════════════════════════
// Вложенные DTO
// ═══════════════════════════════════════════════════════════════════════════════

/** Единица измерения продукта (вложенная) */
export class OrderItemMeasurementUnitDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "gram", type: String })
    name: string;

    @ApiProperty({ example: "g", type: String })
    code: string;
}

/** Продукт в позиции заказа (вложенная) */
export class OrderItemProductDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "Producto A", type: String })
    name: string;

    @ApiPropertyOptional({ example: "SKU-001", type: String, nullable: true })
    sku?: string | null;

    @ApiPropertyOptional({ example: "/storage/products/img.jpg", type: String, nullable: true })
    imageUrl?: string | null;

    @ApiPropertyOptional({ type: () => OrderItemMeasurementUnitDto })
    measurementUnit?: OrderItemMeasurementUnitDto;
}

/** Информация о члене клуба в заказе (вложенная) */
export class OrderMemberDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "John", type: String })
    name: string;

    @ApiPropertyOptional({ example: "Doe", type: String, nullable: true })
    surname?: string | null;

    @ApiPropertyOptional({ example: "MBR-0042", type: String, nullable: true })
    membershipNumber?: string | null;
}

/** Информация о сотруднике в заказе (вложенная) */
export class OrderEmployeeDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "Admin", type: String })
    name: string;

    @ApiPropertyOptional({ example: "User", type: String, nullable: true })
    surname?: string | null;
}

/** Стадия воронки, в которой стоит заказ (вложенная) */
export class OrderStageDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    stageCategoryId: string;

    @ApiProperty({ example: "Готовится", type: String, description: "На языке запроса" })
    name: string;

    @ApiProperty({ example: "#7c3aed", type: String, nullable: true })
    color: string | null;

    @ApiProperty({ enum: StageSemantic, example: StageSemantic.IN_PROGRESS })
    semantic: StageSemantic;

    @ApiProperty({ example: 2, type: Number })
    sortOrder: number;

    @ApiProperty({ example: false, type: Boolean })
    isTerminalSuccess: boolean;

    @ApiProperty({ example: false, type: Boolean })
    isTerminalFailure: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OrderItem Response DTO
// ═══════════════════════════════════════════════════════════════════════════════

export class OrderItemDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    productId: string;

    @ApiProperty({ example: 2.5, type: Number, description: "Количество" })
    quantity: number;

    @ApiProperty({ example: 15.5, type: Number, description: "Цена за единицу на момент заказа" })
    unitPrice: number;

    @ApiProperty({ example: 38.75, type: Number, description: "Итого по позиции" })
    totalPrice: number;

    @ApiProperty({
        example: false,
        type: Boolean,
        description: "Подарок: в сумму заказа не входит (totalPrice = 0)",
    })
    isGift: boolean;

    @ApiPropertyOptional({ example: "Подарочная упаковка", type: String, nullable: true })
    notes?: string | null;

    @ApiProperty({ type: () => OrderItemProductDto })
    product: OrderItemProductDto;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Response — список
// ═══════════════════════════════════════════════════════════════════════════════

export class OrderListDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "ORD-20260316-0001", type: String })
    orderNumber: string;

    @ApiProperty({
        enum: OrderStatus,
        example: OrderStatus.PENDING,
        description: "Для старых клиентов: выводится из стадии; новым клиентам — `stage`",
    })
    status: OrderStatus;

    @ApiProperty({ type: () => OrderStageDto, nullable: true })
    stage: OrderStageDto | null;

    @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
    paymentStatus: PaymentStatus;

    @ApiProperty({ example: 38.75, type: Number })
    subtotal: number;

    @ApiProperty({ example: 0, type: Number })
    discount: number;

    @ApiProperty({ example: 38.75, type: Number })
    total: number;

    @ApiProperty({ example: 3, type: Number, description: "Количество позиций в заказе" })
    itemsCount: number;

    @ApiProperty({ example: "2026-03-16T14:30:00.000Z", type: String })
    orderedAt: string;

    @ApiProperty({ type: () => OrderMemberDto })
    member: OrderMemberDto;

    @ApiPropertyOptional({ type: () => OrderEmployeeDto, nullable: true })
    employee?: OrderEmployeeDto | null;

    @ApiProperty({ example: "2026-03-16T14:30:00.000Z", type: String })
    createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Response — деталка
// ═══════════════════════════════════════════════════════════════════════════════

export class OrderDetailDto extends OrderListDto {
    @ApiPropertyOptional({ example: "Пожалуйста, побыстрее", type: String, nullable: true })
    notes?: string | null;

    @ApiPropertyOptional({ example: "VIP клиент, дать скидку", type: String, nullable: true })
    adminNotes?: string | null;

    @ApiPropertyOptional({ example: "2026-03-16T14:35:00.000Z", type: String, nullable: true })
    confirmedAt?: string | null;

    @ApiPropertyOptional({ example: "2026-03-16T14:40:00.000Z", type: String, nullable: true })
    preparedAt?: string | null;

    @ApiPropertyOptional({ example: "2026-03-16T14:50:00.000Z", type: String, nullable: true })
    readyAt?: string | null;

    @ApiPropertyOptional({ example: "2026-03-16T15:00:00.000Z", type: String, nullable: true })
    completedAt?: string | null;

    @ApiPropertyOptional({ example: null, type: String, nullable: true })
    cancelledAt?: string | null;

    @ApiProperty({ type: () => [OrderItemDto] })
    items: OrderItemDto[];

    @ApiProperty({ example: "2026-03-16T14:30:00.000Z", type: String })
    updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Create Order
// ═══════════════════════════════════════════════════════════════════════════════

/** Позиция для создания заказа */
export class CreateOrderItemDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "ID товара",
    })
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ example: 2.5, type: Number, description: "Количество" })
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0.001)
    quantity: number;

    @ApiPropertyOptional({ example: "Подарочная упаковка", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}

/** Запрос на создание заказа */
export class CreateOrderDto {
    @ApiProperty({
        type: [CreateOrderItemDto],
        description: "Список позиций заказа (минимум 1)",
    })
    @IsArray()
    @ArrayMinSize(1, { message: "Заказ должен содержать хотя бы одну позицию" })
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[];

    @ApiPropertyOptional({ example: "Побыстрее, пожалуйста", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Create Order (CRM): сотрудник оформляет заказ за участника
// ═══════════════════════════════════════════════════════════════════════════════

/** Позиция заказа из CRM: сотрудник может задать свою цену и отметить подарок */
export class CrmCreateOrderItemDto extends CreateOrderItemDto {
    @ApiPropertyOptional({
        example: 12.5,
        type: Number,
        description: "Цена за единицу, €; без неё — цена из каталога",
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(99_999_999.99)
    unitPrice?: number;

    @ApiPropertyOptional({
        example: false,
        type: Boolean,
        description: "Подарок: товар списывается со склада, но в сумму заказа не входит",
    })
    @IsOptional()
    @IsBoolean()
    isGift?: boolean;
}

export class CrmCreateOrderDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description: "Участник клуба, на которого оформляется заказ",
    })
    @IsUUID()
    memberId: string;

    @ApiProperty({
        type: [CrmCreateOrderItemDto],
        description: "Список позиций заказа (минимум 1)",
    })
    @IsArray()
    @ArrayMinSize(1, { message: "Заказ должен содержать хотя бы одну позицию" })
    @ValidateNested({ each: true })
    @Type(() => CrmCreateOrderItemDto)
    items: CrmCreateOrderItemDto[];

    @ApiPropertyOptional({ example: "Забирает вечером", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;

    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
        type: String,
        description:
            "Стадия воронки заказов (manager+); без неё — первая рабочая стадия воронки по умолчанию",
    })
    @IsOptional()
    @IsUUID()
    stageId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Update Order Status (CRM)
// ═══════════════════════════════════════════════════════════════════════════════

export class UpdateOrderStatusDto {
    @ApiProperty({
        enum: OrderStatus,
        example: OrderStatus.CONFIRMED,
        description: "Новый статус заказа",
    })
    @IsEnum(OrderStatus, {
        message: `Допустимые статусы: ${Object.values(OrderStatus).join(", ")}`,
    })
    status: OrderStatus;

    @ApiPropertyOptional({
        example: "Подтверждён, начинаем готовить",
        type: String,
        description: "Примечание от сотрудника",
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    adminNotes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Update Payment Status (CRM)
// ═══════════════════════════════════════════════════════════════════════════════

export class UpdatePaymentStatusDto {
    @ApiProperty({
        enum: PaymentStatus,
        example: PaymentStatus.PAID,
        description: "Новый статус оплаты",
    })
    @IsEnum(PaymentStatus, {
        message: `Допустимые статусы: ${Object.values(PaymentStatus).join(", ")}`,
    })
    paymentStatus: PaymentStatus;

    @ApiPropertyOptional({
        example: "cash",
        type: String,
        description: 'Способ оплаты ("cash", "card", "crypto")',
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    paymentMethod?: string;
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// Cancel Order (Member)
// ═══════════════════════════════════════════════════════════════════════════════

export class CancelOrderDto {
    @ApiPropertyOptional({ example: "Передумал", type: String, description: "Причина отмены" })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
