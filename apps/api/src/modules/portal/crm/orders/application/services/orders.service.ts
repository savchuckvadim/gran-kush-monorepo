import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { OrderStagesService } from "@modules/portal/crm/entity-fields/application/services/order-stages.service";
import { CreateOrderDto, CreateOrderItemDto } from "@modules/portal/crm/orders/api/dto/order.dto";
import {
    Order,
    OrderStatus,
    PaymentStatus,
} from "@modules/portal/crm/orders/domain/entity/order.entity";
import {
    CreateOrderInput,
    OrderFilters,
    OrderRepository,
    UpdateOrderInput,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

/** Сколько раз подбирать свободный номер заказа, прежде чем сдаться */
const ORDER_NUMBER_MAX_ATTEMPTS = 5;

/** `ORD-20260316-` — дата всегда в UTC, чтобы нумерация не зависела от таймзоны сервера */
const buildOrderNumberPrefix = (date: Date): string =>
    `ORD-${date.toISOString().slice(0, 10).replace(/-/g, "")}-`;

/** Конфликт по уникальному индексу `(portal_id, order_number)` */
const isOrderNumberConflict = (error: unknown): boolean => {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        return false;
    }

    const target = error.meta?.target;
    const fields = Array.isArray(target) ? target : [target];
    return fields.some((field) => String(field).includes("order_number"));
};

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly productsService: ProductsService,
        private readonly orderStages: OrderStagesService
    ) {}

    private async resolveStageIdForMemberOrder(
        memberId: string,
        status: OrderStatus
    ): Promise<string | undefined> {
        const portalId = await this.orderStages.resolvePortalIdForMember(memberId);
        if (!portalId) {
            return undefined;
        }
        const id = await this.orderStages.getStageIdForOrderStatus(portalId, status);
        return id ?? undefined;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Queries
    // ═══════════════════════════════════════════════════════════════════════════

    /** Найти заказ по ID */
    async findById(id: string): Promise<Order | null> {
        return this.orderRepository.findById(id);
    }

    /** Найти заказ по ID или кинуть 404 */
    async findByIdOrFail(id: string): Promise<Order> {
        const order = await this.orderRepository.findById(id);
        if (!order) {
            throw new NotFoundException(`Заказ с ID "${id}" не найден`);
        }
        return order;
    }

    /** Найти заказ по ID в пределах портала */
    async findByIdForPortal(id: string, portalId: string): Promise<Order | null> {
        return this.orderRepository.findByIdForPortal(id, portalId);
    }

    /** Найти заказ по ID в пределах портала или кинуть 404 */
    async findByIdForPortalOrFail(id: string, portalId: string): Promise<Order> {
        const order = await this.orderRepository.findByIdForPortal(id, portalId);
        if (!order) {
            throw new NotFoundException(`Заказ с ID "${id}" не найден`);
        }
        return order;
    }

    /** Все заказы с фильтрами */
    async findAll(
        filters?: OrderFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<Order[]> {
        return this.orderRepository.findAll(filters, limit, skip, sortBy, sortOrder);
    }

    /** Подсчёт заказов по фильтрам */
    async count(filters?: OrderFilters): Promise<number> {
        return this.orderRepository.count(filters);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Create Order
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Создать заказ от имени члена клуба.
     * - Проверяет наличие каждого товара
     * - Проверяет достаточное количество на складе
     * - Рассчитывает цены
     * - Генерирует уникальный номер заказа
     * - Списывает товар со склада
     */
    async createOrder(memberId: string, dto: CreateOrderDto, portalId: string): Promise<Order> {
        // 1. Проверить товары и собрать цены
        const resolvedItems = await this.resolveOrderItems(dto.items, portalId);

        // 2. Рассчитать суммы
        const subtotal = resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const discount = 0; // Скидки пока не реализованы
        const total = subtotal - discount;

        // 3. Создать заказ в БД с номером, уникальным в пределах портала
        const stageId = await this.resolveStageIdForMemberOrder(memberId, OrderStatus.PENDING);

        const order = await this.createWithGeneratedOrderNumber(portalId, {
            memberId,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            subtotal,
            discount,
            total,
            notes: dto.notes,
            items: resolvedItems,
            stageId,
        });

        // 4. Списать количество товаров со склада
        for (const item of resolvedItems) {
            await this.productsService.adjustQuantity(
                item.productId,
                portalId,
                new Prisma.Decimal(-item.quantity)
            );
        }

        this.logger.log(
            `✅ Заказ ${order.orderNumber} создан для члена ${memberId}, ` +
                `позиций: ${resolvedItems.length}, сумма: ${total}`
        );

        return order;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Update Order Status (CRM)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Обновить статус заказа (сотрудник CRM).
     * Проверяет допустимость перехода.
     */
    async updateStatus(
        orderId: string,
        newStatus: OrderStatus,
        employeeId: string,
        portalId: string,
        adminNotes?: string
    ): Promise<Order> {
        const order = await this.findByIdForPortalOrFail(orderId, portalId);

        // Проверка допустимости перехода
        this.validateStatusTransition(order.status, newStatus);

        // Временные метки жизненного цикла
        const now = new Date();
        const nextStageId = await this.resolveStageIdForMemberOrder(order.memberId, newStatus);
        const updateData: Record<string, any> = {
            status: newStatus,
            employeeId,
            stageId: nextStageId ?? null,
        };

        if (adminNotes !== undefined) {
            updateData.adminNotes = adminNotes;
        }

        switch (newStatus) {
            case OrderStatus.CONFIRMED:
                updateData.confirmedAt = now;
                break;
            case OrderStatus.PREPARING:
                updateData.preparedAt = now;
                break;
            case OrderStatus.READY:
                updateData.readyAt = now;
                break;
            case OrderStatus.COMPLETED:
                updateData.completedAt = now;
                break;
            case OrderStatus.CANCELLED:
                updateData.cancelledAt = now;
                // Вернуть товары на склад при отмене сотрудником
                await this.restoreProductQuantities(order, portalId);
                break;
        }

        const updated = await this.orderRepository.update(orderId, updateData as UpdateOrderInput);

        this.logger.log(
            `📋 Заказ ${order.orderNumber}: ${order.status} → ${newStatus} (сотрудник: ${employeeId})`
        );

        return updated;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Update Payment Status (CRM)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Обновить статус оплаты (сотрудник CRM).
     */
    async updatePaymentStatus(
        orderId: string,
        newPaymentStatus: PaymentStatus,
        employeeId: string,
        portalId: string
    ): Promise<Order> {
        const order = await this.findByIdForPortalOrFail(orderId, portalId);

        // Нельзя менять оплату у отменённого заказа
        if (order.status === OrderStatus.CANCELLED) {
            throw new BadRequestException("Нельзя изменить оплату отменённого заказа");
        }

        // Нельзя возвратить, если не было оплаты
        if (
            newPaymentStatus === PaymentStatus.REFUNDED &&
            order.paymentStatus !== PaymentStatus.PAID
        ) {
            throw new BadRequestException("Возврат возможен только для оплаченных заказов");
        }

        const updated = await this.orderRepository.update(orderId, {
            paymentStatus: newPaymentStatus,
            employeeId,
        } as UpdateOrderInput);

        this.logger.log(
            `💳 Заказ ${order.orderNumber}: оплата ${order.paymentStatus} → ${newPaymentStatus}`
        );

        return updated;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Cancel Order (Member)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Отменить заказ (инициировано членом клуба).
     * Возможно только в статусе PENDING.
     */
    async cancelOrderByMember(
        orderId: string,
        memberId: string,
        portalId: string,
        reason?: string
    ): Promise<Order> {
        const order = await this.findByIdOrFail(orderId);

        // Проверить, что заказ принадлежит этому члену
        if (order.memberId !== memberId) {
            throw new ForbiddenException("Нет доступа к этому заказу");
        }

        // Отмена возможна только в статусе PENDING
        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException(
                `Отмена невозможна: заказ уже в статусе "${order.status}". ` +
                    `Отмена возможна только для заказов в статусе "${OrderStatus.PENDING}"`
            );
        }

        // Вернуть товары на склад
        await this.restoreProductQuantities(order, portalId);

        const cancelStageId = await this.resolveStageIdForMemberOrder(
            memberId,
            OrderStatus.CANCELLED
        );

        const updated = await this.orderRepository.update(orderId, {
            status: OrderStatus.CANCELLED,
            stageId: cancelStageId ?? null,
            cancelledAt: new Date(),
            adminNotes: reason ? `Отменено участником: ${reason}` : "Отменено участником",
        } as UpdateOrderInput);

        this.logger.log(`❌ Заказ ${order.orderNumber} отменён участником ${memberId}`);

        return updated;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Проверить товары, доступность и рассчитать цены.
     */
    private async resolveOrderItems(
        items: CreateOrderItemDto[],
        portalId: string
    ): Promise<
        Array<{
            productId: string;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
            notes?: string;
        }>
    > {
        const resolved: Array<{
            productId: string;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
            notes?: string;
        }> = [];

        for (const item of items) {
            const product = await this.productsService.findById(item.productId, portalId);
            if (!product) {
                throw new NotFoundException(`Товар с ID "${item.productId}" не найден`);
            }

            if (!product.isActive || !product.isAvailable) {
                throw new BadRequestException(`Товар "${product.name}" недоступен для заказа`);
            }

            // Проверка остатка
            const quantityDec = new Prisma.Decimal(item.quantity);
            if (product.currentQuantity.lessThan(quantityDec)) {
                throw new BadRequestException(
                    `Недостаточно товара "${product.name}". ` +
                        `Доступно: ${product.currentQuantity.toString()}, запрошено: ${item.quantity}`
                );
            }

            const unitPrice = Number(product.price);
            const totalPrice = +(unitPrice * item.quantity).toFixed(2);

            resolved.push({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice,
                totalPrice,
                notes: item.notes,
            });
        }

        return resolved;
    }

    /**
     * Вернуть товары на склад при отмене заказа.
     */
    private async restoreProductQuantities(order: Order, portalId: string): Promise<void> {
        if (!order.items || order.items.length === 0) return;

        for (const item of order.items) {
            try {
                await this.productsService.adjustQuantity(
                    item.productId,
                    portalId,
                    new Prisma.Decimal(Number(item.quantity))
                );
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(
                    `Не удалось вернуть товар ${item.productId} на склад: ${message}`
                );
                // Продолжаем, даже если один товар не удалось вернуть
            }
        }
    }

    /**
     * Создать заказ, подобрав номер, свободный в пределах портала.
     *
     * Номер вычисляется из максимального существующего, поэтому два параллельных заказа
     * могут получить одинаковый. Гонку ловит уникальный индекс `(portal_id, order_number)`:
     * при конфликте транзакция откатывается целиком и номер подбирается заново.
     */
    private async createWithGeneratedOrderNumber(
        portalId: string,
        input: Omit<CreateOrderInput, "orderNumber">
    ): Promise<Order> {
        for (let attempt = 1; attempt <= ORDER_NUMBER_MAX_ATTEMPTS; attempt++) {
            const orderNumber = await this.generateOrderNumber(portalId);
            try {
                return await this.orderRepository.create({ ...input, orderNumber });
            } catch (error) {
                if (attempt === ORDER_NUMBER_MAX_ATTEMPTS || !isOrderNumberConflict(error)) {
                    throw error;
                }
                this.logger.warn(
                    `Номер заказа ${orderNumber} занят (попытка ${attempt}), подбираю следующий`
                );
            }
        }

        // Недостижимо: цикл либо возвращает заказ, либо пробрасывает ошибку на последней попытке
        throw new Error("Не удалось подобрать номер заказа");
    }

    /**
     * Генерация номера заказа: ORD-YYYYMMDD-NNNN.
     * Нумерация ведётся отдельно в каждом портале — номера одного клуба не выдают объём другого.
     */
    private async generateOrderNumber(portalId: string): Promise<string> {
        const prefix = buildOrderNumberPrefix(new Date()); // ORD-20260316-

        const lastNumber = await this.orderRepository.getLastOrderNumberWithPrefix(
            portalId,
            prefix
        );

        let sequence = 1;
        if (lastNumber) {
            // ORD-20260316-0042 → 42
            const lastSeq = parseInt(lastNumber.slice(prefix.length), 10);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }

        return `${prefix}${sequence.toString().padStart(4, "0")}`;
    }

    /**
     * Допустимые переходы статусов.
     */
    private static readonly STATUS_TRANSITIONS: Record<string, string[]> = {
        [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
        [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        [OrderStatus.COMPLETED]: [], // Терминальный
        [OrderStatus.CANCELLED]: [], // Терминальный
    };

    /**
     * Проверить допустимость перехода статуса.
     */
    private validateStatusTransition(current: OrderStatus, next: OrderStatus): void {
        const allowed = OrdersService.STATUS_TRANSITIONS[current] ?? [];
        if (!allowed.includes(next)) {
            throw new BadRequestException(
                `Недопустимый переход статуса: "${current}" → "${next}". ` +
                    `Допустимые: ${allowed.length > 0 ? allowed.join(", ") : "нет (терминальный статус)"}`
            );
        }
    }
}
