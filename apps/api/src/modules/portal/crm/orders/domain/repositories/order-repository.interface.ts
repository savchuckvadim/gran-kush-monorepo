import { Order } from "@modules/portal/crm/orders/domain/entity/order.entity";

// ─── Фильтры для выборки заказов ────────────────────────────────────────────

export interface OrderFilters {
    portalId?: string;
    memberId?: string;
    employeeId?: string;
    status?: string;
    paymentStatus?: string;
    /** Начало периода (включительно) */
    startDate?: Date;
    /** Конец периода (включительно) */
    endDate?: Date;
    /** Поиск по номеру заказа */
    search?: string;
}

// ─── Данные для создания позиции заказа ──────────────────────────────────────

export interface CreateOrderItemInput {
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
}

// ─── Данные для создания заказа ──────────────────────────────────────────────

export interface CreateOrderInput {
    memberId: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    subtotal: number;
    discount: number;
    total: number;
    notes?: string;
    items: CreateOrderItemInput[];
    /** Стадия воронки (портал) */
    stageId?: string | null;
}

// ─── Данные для обновления заказа ────────────────────────────────────────────

export interface UpdateOrderInput {
    employeeId?: string | null;
    status?: string;
    stageId?: string | null;
    paymentStatus?: string;
    confirmedAt?: Date | null;
    preparedAt?: Date | null;
    readyAt?: Date | null;
    completedAt?: Date | null;
    cancelledAt?: Date | null;
    adminNotes?: string | null;
    discount?: number;
    total?: number;
}

// ─── Интерфейс репозитория ──────────────────────────────────────────────────

export abstract class OrderRepository {
    /** Найти заказ по ID (с позициями и связями) */
    abstract findById(id: string): Promise<Order | null>;

    /** Найти заказ по ID в пределах портала (tenant-scoped) */
    abstract findByIdForPortal(id: string, portalId: string): Promise<Order | null>;

    /** Найти все заказы с фильтрами, пагинацией и сортировкой */
    abstract findAll(
        filters?: OrderFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<Order[]>;

    /** Подсчитать заказы по фильтрам */
    abstract count(filters?: OrderFilters): Promise<number>;

    /** Создать заказ с позициями (транзакционно) */
    abstract create(data: CreateOrderInput): Promise<Order>;

    /** Обновить заказ (без позиций) */
    abstract update(id: string, data: UpdateOrderInput): Promise<Order>;

    /**
     * Перевести статус оплаты только если он всё ещё равен `from` (compare-and-set).
     * Возвращает `false`, если строку успел изменить кто-то другой — это ожидаемый
     * исход параллельного запроса, а не ошибка.
     */
    abstract compareAndSetPaymentStatus(input: {
        orderId: string;
        portalId: string;
        from: string;
        to: string;
        employeeId?: string;
    }): Promise<boolean>;

    /**
     * Наибольший номер заказа с данным префиксом в пределах портала.
     * Префикс несёт дату, поэтому дневная нумерация не зависит от таймзоны сервера.
     */
    abstract getLastOrderNumberWithPrefix(portalId: string, prefix: string): Promise<string | null>;
}
