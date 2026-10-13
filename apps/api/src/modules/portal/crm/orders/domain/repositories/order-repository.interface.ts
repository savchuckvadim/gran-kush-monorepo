import {
    Order,
    OrderStatus,
    PaymentStatus,
} from "@modules/portal/crm/orders/domain/entity/order.entity";
import {
    OrderStage,
    OrderStageSummary,
} from "@modules/portal/crm/orders/domain/entity/order-stage.entity";

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
    notes?: string;
}

// ─── Данные для создания заказа ──────────────────────────────────────────────

export interface CreateOrderInput {
    memberId: string;
    orderNumber: string;
    paymentStatus: PaymentStatus;
    subtotal: number;
    discount: number;
    total: number;
    notes?: string;
    items: CreateOrderItemInput[];
    /** Стадия воронки; без неё — первая рабочая стадия воронки по умолчанию */
    stageId?: string | null;
}

// ─── Данные для обновления заказа ────────────────────────────────────────────

/** Стадию здесь не меняют: только {@link OrderRepository.compareAndSetStage}. */
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

    /** Создать заказ с позициями (транзакционно) */
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
     * Перевести заказ в стадию, только если он всё ещё стоит в `fromStageId` (compare-and-set).
     * `false` — стадию успел сменить параллельный запрос: двойная отмена не вернёт товар дважды.
     */
    abstract compareAndSetStage(input: {
        orderId: string;
        portalId: string;
        fromStageId: string | null;
        toStageId: string;
    }): Promise<boolean>;

    /** Стадия из воронок заказов этого портала; чужая или не заказная — null */
    abstract findStageInPortal(portalId: string, stageId: string): Promise<OrderStage | null>;

    /**
     * Стадии воронки заказов портала по порядку. Без `stageCategoryId` — воронка по умолчанию;
     * воронка чужого портала или другой сущности — пустой список.
     */
    abstract findFunnelStages(
        portalId: string,
        stageCategoryId?: string | null
    ): Promise<OrderStage[]>;

    /** Число и сумма заказов в каждой из стадий при тех же фильтрах, что у списка */
    abstract summarizeByStage(
        filters: OrderFilters,
        stageIds: readonly string[]
    ): Promise<OrderStageSummary[]>;

    /**
     * Наибольший номер заказа с данным префиксом в пределах портала.
     * Префикс несёт дату, поэтому дневная нумерация не зависит от таймзоны сервера.
     */
    abstract getLastOrderNumberWithPrefix(portalId: string, prefix: string): Promise<string | null>;
}
