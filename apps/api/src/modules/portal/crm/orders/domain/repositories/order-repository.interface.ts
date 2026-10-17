import {
    Order,
    OrderStatus,
    PaymentStatus,
} from "@modules/portal/crm/orders/domain/entity/order.entity";

// ─── Фильтры для выборки заказов ────────────────────────────────────────────

export interface OrderFilters {
    portalId?: string;
    memberId?: string;
    employeeId?: string;
    /** Старый статус (совместимость): закрытые — по семантике стадии, рабочие — по имени */
    status?: OrderStatus;
    /** Стадия воронки — колонка канбана, фильтр списка */
    stageId?: string;
    paymentStatus?: PaymentStatus;
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
    isGift?: boolean;
    notes?: string;
    /** Граммы лимита участника, которые занимает позиция (`monthly-limit.ts`) */
    limitGrams: number;
}

// ─── Данные для создания заказа ──────────────────────────────────────────────

export interface CreateOrderInput {
    memberId: string;
    /** Сотрудник CRM, оформивший заказ; заказ из кабинета — без него */
    employeeId?: string | null;
    orderNumber: string;
    paymentStatus: PaymentStatus;
    subtotal: number;
    discount: number;
    total: number;
    notes?: string;
    items: CreateOrderItemInput[];
    /** Стадия воронки; без неё — первая рабочая стадия воронки по умолчанию */
    stageId?: string | null;
    /** Лимит участника за 30 дней; задан — транзакция заказа проверяет его атомарно */
    monthlyLimitGrams?: number | null;
}

/** Сколько товара вернуть на склад */
export interface StockLine {
    productId: string;
    quantity: number;
}

// ─── Данные для обновления заказа ────────────────────────────────────────────

/** Стадию здесь не меняют: только {@link OrderStageRepository.compareAndSetStage}. */
export interface UpdateOrderInput {
    employeeId?: string | null;
    paymentStatus?: PaymentStatus;
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

    /**
     * Создать заказ с позициями и списать товар со склада в одной транзакции. Остаток
     * проверяет само списание, поэтому параллельные заказы не продадут больше, чем есть.
     * Не хватило товара — {@link InsufficientStockError}, и не записано ничего.
     */
    abstract create(data: CreateOrderInput): Promise<Order>;

    /** Обновить заказ (без позиций и без стадии) */
    abstract update(id: string, data: UpdateOrderInput): Promise<Order>;

    /**
     * Перевести статус оплаты только если он всё ещё равен `from` (compare-and-set).
     * Возвращает `false`, если строку успел изменить кто-то другой — это ожидаемый
     * исход параллельного запроса, а не ошибка.
     */
    abstract compareAndSetPaymentStatus(input: {
        orderId: string;
        portalId: string;
        from: PaymentStatus;
        to: PaymentStatus;
        employeeId?: string;
    }): Promise<boolean>;

    /**
     * Наибольший номер заказа с данным префиксом в пределах портала.
     * Префикс несёт дату, поэтому дневная нумерация не зависит от таймзоны сервера.
     */
    abstract getLastOrderNumberWithPrefix(portalId: string, prefix: string): Promise<string | null>;

    /** Граммы лимита, которые участник занял с `since` (без отменённых заказов). */
    abstract sumLimitUsage(memberId: string, since: Date): Promise<number>;
}
