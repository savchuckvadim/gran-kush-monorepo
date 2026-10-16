import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { StageSemantic } from "@prisma/client";

import { PaymentStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";

/*
 * Заказ глазами участника. Внутренние данные клуба (заметки сотрудников, кто оформил, артикулы)
 * сюда не попадают; стадия — как её назвал клуб, на языке запроса.
 */

export class CabinetOrderStageDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "Готовится", type: String, description: "На языке запроса" })
    name: string;

    @ApiProperty({ example: "#7c3aed", type: String, nullable: true })
    color: string | null;

    @ApiProperty({ enum: StageSemantic, example: StageSemantic.IN_PROGRESS })
    semantic: StageSemantic;
}

export class CabinetOrderItemDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    productId: string;

    @ApiProperty({ example: "Producto A", type: String })
    name: string;

    @ApiPropertyOptional({ example: "/storage/products/img.jpg", type: String, nullable: true })
    imageUrl: string | null;

    @ApiPropertyOptional({ example: "g", type: String, nullable: true })
    unitCode: string | null;

    @ApiProperty({ example: 2.5, type: Number })
    quantity: number;

    @ApiProperty({ example: 15.5, type: Number })
    unitPrice: number;

    @ApiProperty({ example: 38.75, type: Number })
    totalPrice: number;

    @ApiProperty({ example: false, type: Boolean, description: "Подарок клуба: в сумму не входит" })
    isGift: boolean;
}

export class CabinetOrderListDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "ORD-20260316-0001", type: String })
    orderNumber: string;

    @ApiProperty({ type: () => CabinetOrderStageDto, nullable: true })
    stage: CabinetOrderStageDto | null;

    @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
    paymentStatus: PaymentStatus;

    @ApiProperty({ example: 38.75, type: Number })
    total: number;

    @ApiProperty({ example: 2, type: Number })
    itemsCount: number;

    @ApiProperty({ example: "2026-03-16T12:00:00.000Z", type: String })
    orderedAt: string;

    @ApiProperty({ type: Boolean, description: "Участник ещё может отменить заказ сам" })
    canCancel: boolean;
}

export class CabinetOrderDetailDto extends CabinetOrderListDto {
    @ApiProperty({ example: 38.75, type: Number })
    subtotal: number;

    @ApiProperty({ example: 0, type: Number })
    discount: number;

    @ApiPropertyOptional({ example: "Recogeré a las 18:00", type: String, nullable: true })
    notes: string | null;

    @ApiProperty({ type: () => [CabinetOrderItemDto] })
    items: CabinetOrderItemDto[];

    @ApiPropertyOptional({ example: "2026-03-16T12:00:00.000Z", type: String, nullable: true })
    completedAt: string | null;

    @ApiPropertyOptional({ example: "2026-03-16T12:00:00.000Z", type: String, nullable: true })
    cancelledAt: string | null;
}
