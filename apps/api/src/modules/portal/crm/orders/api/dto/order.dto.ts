import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { StageSemantic, TaxTreatment } from "@prisma/client";

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

    @ApiProperty({
        type: Number,
        nullable: true,
        example: 21,
        description: "Ставка налога на момент заказа (TASK-797); null — заказ без разбивки",
    })
    taxPercent: number | null;

    @ApiProperty({ enum: TaxTreatment, enumName: "TaxTreatment", nullable: true })
    taxTreatment: TaxTreatment | null;

    @ApiProperty({ type: Number, nullable: true, example: 32.02, description: "База строки" })
    netAmount: number | null;

    @ApiProperty({ type: Number, nullable: true, example: 6.73, description: "Налог строки" })
    taxAmount: number | null;

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

    @ApiProperty({
        type: Number,
        nullable: true,
        example: 32.02,
        description: "База заказа — сумма баз строк; null — заказ без разбивки",
    })
    netTotal: number | null;

    @ApiProperty({ type: Number, nullable: true, example: 6.73, description: "Налог заказа" })
    taxTotal: number | null;

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
