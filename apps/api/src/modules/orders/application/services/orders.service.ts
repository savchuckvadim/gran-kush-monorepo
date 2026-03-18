import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import { Prisma } from "@prisma/client";

type Decimal = Prisma.Decimal;

import { ProductsService } from "@catalog/application/services/products.service";
import { CreateOrderDto, CreateOrderItemDto } from "@orders/api/dto/order.dto";
import { Order, OrderStatus, PaymentStatus } from "@orders/domain/entity/order.entity";
import {
    CreateOrderInput,
    OrderFilters,
    OrderRepository,
} from "@orders/domain/repositories/order-repository.interface";

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly productsService: ProductsService
    ) {}

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

    /** Найти заказ по номеру */
    async findByOrderNumber(orderNumber: string): Promise<Order | null> {
        return this.orderRepository.findByOrderNumber(orderNumber);
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
    async createOrder(memberId: string, dto: CreateOrderDto): Promise<Order> {
        // 1. Проверить товары и собрать цены
        const resolvedItems = await this.resolveOrderItems(dto.items);

        // 2. Рассчитать суммы
        const subtotal = resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const discount = 0; // Скидки пока не реализованы
        const total = subtotal - discount;

        // 3. Сгенерировать номер заказа
        const orderNumber = await this.generateOrderNumber();

        // 4. Создать заказ в БД
        const orderInput: CreateOrderInput = {
            memberId,
            orderNumber,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            subtotal,
            discount,
            total,
            notes: dto.notes,
            items: resolvedItems,
        };

        const order = await this.orderRepository.create(orderInput);

        // 5. Списать количество товаров со склада
        for (const item of resolvedItems) {
            await this.productsService.adjustQuantity(
                item.productId,
                new Prisma.Decimal(-item.quantity)
            );
        }

        this.logger.log(
            `✅ Заказ ${orderNumber} создан для члена ${memberId}, ` +
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
        adminNotes?: string
    ): Promise<Order> {
        const order = await this.findByIdOrFail(orderId);

        // Проверка допустимости перехода
        this.validateStatusTransition(order.status as OrderStatus, newStatus);

        // Временные метки жизненного цикла
        const now = new Date();
        const updateData: Record<string, any> = {
            status: newStatus,
            employeeId,
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
                await this.restoreProductQuantities(order);
                break;
        }

        const updated = await this.orderRepository.update(orderId, updateData);

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
        employeeId: string
    ): Promise<Order> {
        const order = await this.findByIdOrFail(orderId);

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
        });

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
    async cancelOrderByMember(orderId: string, memberId: string, reason?: string): Promise<Order> {
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
        await this.restoreProductQuantities(order);

        const updated = await this.orderRepository.update(orderId, {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
            adminNotes: reason ? `Отменено участником: ${reason}` : "Отменено участником",
        });

        this.logger.log(`❌ Заказ ${order.orderNumber} отменён участником ${memberId}`);

        return updated;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Проверить товары, доступность и рассчитать цены.
     */
    private async resolveOrderItems(items: CreateOrderItemDto[]): Promise<
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
            const product = await this.productsService.findById(item.productId);
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
    private async restoreProductQuantities(order: Order): Promise<void> {
        if (!order.items || order.items.length === 0) return;

        for (const item of order.items) {
            try {
                await this.productsService.adjustQuantity(
                    item.productId,
                    new Prisma.Decimal(Number(item.quantity))
                );
            } catch (error) {
                this.logger.error(
                    `Не удалось вернуть товар ${item.productId} на склад: ${error.message}`
                );
                // Продолжаем, даже если один товар не удалось вернуть
            }
        }
    }

    /**
     * Генерация номера заказа: ORD-YYYYMMDD-NNNN
     */
    private async generateOrderNumber(): Promise<string> {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // 20260316

        const lastNumber = await this.orderRepository.getLastOrderNumberForDate(now);

        let sequence = 1;
        if (lastNumber) {
            // ORD-20260316-0042 → 42
            const parts = lastNumber.split("-");
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }

        const seqStr = sequence.toString().padStart(4, "0");
        return `ORD-${dateStr}-${seqStr}`;
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
