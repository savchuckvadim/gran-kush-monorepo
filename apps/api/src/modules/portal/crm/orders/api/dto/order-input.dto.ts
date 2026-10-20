import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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

import { OrderStatus, PaymentStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";

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
// Cancel Order (Member)
// ═══════════════════════════════════════════════════════════════════════════════

export class CancelOrderDto {
    @ApiPropertyOptional({ example: "Передумал", type: String, description: "Причина отмены" })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
