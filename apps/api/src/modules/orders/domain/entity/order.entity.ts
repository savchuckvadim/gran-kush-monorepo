import { Prisma } from "@prisma/client";

type Decimal = Prisma.Decimal;

/**
 * Статусы заказа
 */
export enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PREPARING = "preparing",
    READY = "ready",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
}

/**
 * Статусы оплаты
 */
export enum PaymentStatus {
    PENDING = "pending",
    PAID = "paid",
    REFUNDED = "refunded",
}

/**
 * Domain Entity — OrderItem (Позиция заказа)
 */
export class OrderItem {
    id: string;
    orderId: string;
    productId: string;

    // Количество и цена
    quantity: Decimal;
    unitPrice: Decimal;
    totalPrice: Decimal;

    // Примечания
    notes?: string | null;

    createdAt: Date;
    updatedAt: Date;

    // Relations (опционально загружаемые)
    product?: {
        id: string;
        name: string;
        sku?: string | null;
        imageUrl?: string | null;
        measurementUnit?: {
            id: string;
            name: string;
            code: string;
        };
    };

    constructor(partial: Partial<OrderItem>) {
        Object.assign(this, partial);
    }
}

/**
 * Domain Entity — Order (Заказ)
 */
export class Order {
    id: string;
    memberId: string;
    employeeId?: string | null;

    // Номер заказа
    orderNumber: string;

    // Статусы
    status: string; // OrderStatus enum value
    paymentStatus: string; // PaymentStatus enum value

    // Суммы
    subtotal: Decimal;
    discount: Decimal;
    total: Decimal;

    // Жизненный цикл
    orderedAt: Date;
    confirmedAt?: Date | null;
    preparedAt?: Date | null;
    readyAt?: Date | null;
    completedAt?: Date | null;
    cancelledAt?: Date | null;

    // Примечания
    notes?: string | null;
    adminNotes?: string | null;

    createdAt: Date;
    updatedAt: Date;

    // Relations (опционально загружаемые)
    items?: OrderItem[];
    member?: {
        id: string;
        name: string;
        surname?: string | null;
        membershipNumber?: string | null;
    };
    employee?: {
        id: string;
        name: string;
        surname?: string | null;
    };

    constructor(partial: Partial<Order>) {
        Object.assign(this, partial);
    }
}
