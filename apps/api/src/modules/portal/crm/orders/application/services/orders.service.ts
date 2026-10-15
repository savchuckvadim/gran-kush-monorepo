import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import { Prisma, StageSemantic } from "@prisma/client";

import { isUniqueViolationOn } from "@common/prisma/unique-violation";
import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import {
    CreateOrderDto,
    CreateOrderItemDto,
    CrmCreateOrderDto,
    CrmCreateOrderItemDto,
} from "@modules/portal/crm/orders/api/dto/order.dto";
import {
    Order,
    OrderStatus,
    PaymentStatus,
} from "@modules/portal/crm/orders/domain/entity/order.entity";
import {
    OrderStage,
    OrderStageSummary,
} from "@modules/portal/crm/orders/domain/entity/order-stage.entity";
import { InsufficientStockError } from "@modules/portal/crm/orders/domain/errors/insufficient-stock.error";
import {
    isClosedStage,
    isFailureStage,
    lifecycleFieldFor,
    stageForLegacyStatus,
} from "@modules/portal/crm/orders/domain/order-stage.rules";
import {
    CreateOrderInput,
    CreateOrderItemInput,
    OrderFilters,
    OrderRepository,
    StockLine,
    UpdateOrderInput,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

/** Сколько раз подбирать свободный номер заказа, прежде чем сдаться */
const ORDER_NUMBER_MAX_ATTEMPTS = 5;

/**
 * Машина состояний оплаты — только вперёд. Нужна не ради строгости, а потому что
 * поздно доставленный вебхук с `pending` иначе откатит уже наступившее `paid`.
 */
const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
    [PaymentStatus.PENDING]: [PaymentStatus.PAID],
    [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
    [PaymentStatus.REFUNDED]: [],
};

/** `ORD-20260316-` — дата всегда в UTC, чтобы нумерация не зависела от таймзоны сервера */
const buildOrderNumberPrefix = (date: Date): string =>
    `ORD-${date.toISOString().slice(0, 10).replace(/-/g, "")}-`;

/** Позиция нового заказа. Цену и подарок задаёт только сотрудник CRM — в DTO кабинета их нет */
type NewOrderItem = CreateOrderItemDto &
    Partial<Pick<CrmCreateOrderItemDto, "unitPrice" | "isGift">>;

/** Позиция, проверенная по каталогу; имя — для понятной ошибки, если товар кончится */
interface ResolvedOrderItem extends CreateOrderItemInput {
    name: string;
}

/** Что вернуть на склад при отмене заказа */
const stockLinesOf = (order: Order): StockLine[] =>
    (order.items ?? []).map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
    }));

/** Конфликт по уникальному индексу `(portal_id, order_number)` */
const isOrderNumberConflict = (error: unknown): boolean =>
    isUniqueViolationOn(error, "order_number");

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly productsService: ProductsService,
        private readonly membersService: MembersService
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
        return this.placeOrder(portalId, { memberId, items: dto.items, notes: dto.notes });
    }

    /**
     * Заказ, который сотрудник CRM оформляет за участника: цену позиции можно поправить,
     * позицию — отметить подарком, стадию — выбрать (право на выбор стадии проверяет
     * контроллер: manager+). Сразу в стадию отмены заказ не создаётся — склад бы не сошёлся.
     */
    async createOrderByEmployee(
        dto: CrmCreateOrderDto,
        employeeId: string,
        portalId: string
    ): Promise<Order> {
        const member = await this.membersService.findByIdForPortal(dto.memberId, portalId);
        if (!member) {
            throw new NotFoundException("Участник не найден");
        }
        if (!member.isActive) {
            throw new BadRequestException("Участник не активен");
        }

        let stage: OrderStage | null = null;
        if (dto.stageId) {
            stage = await this.orderRepository.findStageInPortal(portalId, dto.stageId);
            if (!stage) {
                throw new BadRequestException("Стадия не из воронки заказов этого клуба");
            }
            if (isFailureStage(stage)) {
                throw new BadRequestException("Нельзя создать заказ сразу в стадии отмены");
            }
        }

        const order = await this.placeOrder(portalId, {
            memberId: dto.memberId,
            items: dto.items,
            notes: dto.notes,
            employeeId,
            stageId: stage?.id,
        });

        // заказ, созданный сразу в стадии «выполнен» или «готов», получает её метку времени
        const lifecycleField = stage ? lifecycleFieldFor(stage) : undefined;
        if (!lifecycleField) return order;
        const update: UpdateOrderInput = {};
        update[lifecycleField] = new Date();
        return this.orderRepository.update(order.id, update);
    }

    /**
     * Общая часть оформления: проверить товары, посчитать суммы, создать заказ с номером и
     * списать товар. Без `stageId` стадию — первую рабочую воронки по умолчанию — подставляет
     * репозиторий.
     */
    private async placeOrder(
        portalId: string,
        input: {
            memberId: string;
            items: NewOrderItem[];
            notes?: string;
            employeeId?: string;
            stageId?: string;
        }
    ): Promise<Order> {
        const { memberId, employeeId } = input;

        // 1. Проверить товары и собрать цены
        const resolvedItems = await this.resolveOrderItems(input.items, portalId);

        // 2. Рассчитать суммы
        const subtotal = +resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2);
        const discount = 0; // Скидки пока не реализованы
        const total = subtotal - discount;

        // 3. Создать заказ с номером, уникальным в пределах портала, и списать товар — одной
        //    транзакцией
        let order: Order;
        try {
            order = await this.createWithGeneratedOrderNumber(portalId, {
                memberId,
                employeeId,
                paymentStatus: PaymentStatus.PENDING,
                subtotal,
                discount,
                total,
                notes: input.notes,
                items: resolvedItems,
                stageId: input.stageId,
            });
        } catch (error) {
            if (!(error instanceof InsufficientStockError)) throw error;
            // проверка выше прошла, но товар успели заказать параллельно
            const name = resolvedItems.find((item) => item.productId === error.productId)?.name;
            throw new BadRequestException(
                `Недостаточно товара "${name ?? error.productId}": его только что заказали. ` +
                    "Обновите каталог"
            );
        }

        this.logger.log(
            `✅ Заказ ${order.orderNumber} создан для члена ${memberId}, ` +
                `позиций: ${resolvedItems.length}, сумма: ${total}` +
                (employeeId ? ` (сотрудник: ${employeeId})` : "")
        );

        return order;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Stages (CRM): полоса стадий в карточке и канбан
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Перевести заказ в стадию воронки (сотрудник CRM, manager+). Между рабочими стадиями —
     * в любую сторону; закрытый заказ не двигается; отмена возвращает товар на склад.
     */
    async moveToStage(
        orderId: string,
        stageId: string,
        employeeId: string,
        portalId: string
    ): Promise<Order> {
        const order = await this.findByIdForPortalOrFail(orderId, portalId);
        const target = await this.orderRepository.findStageInPortal(portalId, stageId);
        if (!target) {
            throw new BadRequestException("Стадия не из воронки заказов этого клуба");
        }
        return this.applyStage(order, target, portalId, { employeeId });
    }

    /**
     * Обновить статус заказа старым способом (совместимость): статус переводится в стадию
     * воронки заказа, дальше — те же правила, что у {@link moveToStage}.
     */
    async updateStatus(
        orderId: string,
        newStatus: OrderStatus,
        employeeId: string,
        portalId: string,
        adminNotes?: string
    ): Promise<Order> {
        const order = await this.findByIdForPortalOrFail(orderId, portalId);
        const stages = await this.orderRepository.findFunnelStages(
            portalId,
            order.stage?.stageCategoryId
        );
        const target = stageForLegacyStatus(stages, newStatus);
        if (!target) {
            throw new BadRequestException(`В воронке заказа нет стадии для статуса "${newStatus}"`);
        }
        return this.applyStage(order, target, portalId, { employeeId, adminNotes });
    }

    /** Число и сумма заказов в стадиях воронки — шапки колонок канбана. */
    async summarizeFunnel(
        portalId: string,
        stageCategoryId: string,
        filters: Omit<OrderFilters, "portalId" | "stageId" | "status">
    ): Promise<OrderStageSummary[]> {
        const stages = await this.orderRepository.findFunnelStages(portalId, stageCategoryId);
        if (stages.length === 0) {
            throw new NotFoundException("Воронка заказов не найдена");
        }
        return this.orderRepository.summarizeByStage(
            { ...filters, portalId },
            stages.map((stage) => stage.id)
        );
    }

    /**
     * Общий переход стадии: compare-and-set по текущей стадии, затем склад и метки жизненного
     * цикла. Проигравший параллельный запрос получает 409, а не тихий успех.
     */
    private async applyStage(
        order: Order,
        target: OrderStage,
        portalId: string,
        extra: { employeeId?: string; adminNotes?: string }
    ): Promise<Order> {
        const current = order.stage ?? null;
        if (current?.id === target.id) {
            // Повтор того же перехода — запрос уже применён
            return order;
        }
        if (current && isClosedStage(current)) {
            throw new BadRequestException("Заказ закрыт: его стадию больше нельзя менять");
        }

        // отмена возвращает товар на склад в одной транзакции со сменой стадии
        const won = await this.orderRepository.compareAndSetStage({
            orderId: order.id,
            portalId,
            fromStageId: current?.id ?? null,
            toStageId: target.id,
            restock: isFailureStage(target) ? stockLinesOf(order) : undefined,
        });
        if (!won) {
            throw new ConflictException(
                "Стадию заказа изменил параллельный запрос — обновите заказ"
            );
        }

        const update: UpdateOrderInput = {};
        const lifecycleField = lifecycleFieldFor(target);
        if (lifecycleField && !order[lifecycleField]) {
            update[lifecycleField] = new Date();
        }
        if (extra.employeeId) update.employeeId = extra.employeeId;
        if (extra.adminNotes !== undefined) update.adminNotes = extra.adminNotes;

        const updated = await this.orderRepository.update(order.id, update);

        this.logger.log(
            `📋 Заказ ${order.orderNumber}: стадия ${current?.name ?? "—"} → ${target.name}` +
                (extra.employeeId ? ` (сотрудник: ${extra.employeeId})` : "")
        );

        return updated;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Update Payment Status (CRM)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Обновить статус оплаты (сотрудник CRM).
     *
     * Статус двигается только вперёд по машине состояний и переводится
     * compare-and-set'ом. Прежний порядок — прочитать, проверить, записать —
     * позволял двум параллельным запросам одновременно пройти проверку и обоим
     * записать: повторное «оплачено» по одному заказу, а с ним и вторая проводка.
     */
    async updatePaymentStatus(
        orderId: string,
        newPaymentStatus: PaymentStatus,
        employeeId: string,
        portalId: string
    ): Promise<Order> {
        const order = await this.findByIdForPortalOrFail(orderId, portalId);

        // Нельзя менять оплату у отменённого заказа. Статус заказа живёт на
        // EntityRecord, в один UPDATE с оплатой его не свести — проверка остаётся чтением.
        if (order.status === OrderStatus.CANCELLED) {
            throw new BadRequestException("Нельзя изменить оплату отменённого заказа");
        }

        const current = order.paymentStatus;
        if (current === newPaymentStatus) {
            // Повтор того же перехода — не ошибка: запрос уже применён.
            return order;
        }
        if (!PAYMENT_STATUS_TRANSITIONS[current]?.includes(newPaymentStatus)) {
            throw new BadRequestException(
                `Недопустимый переход оплаты: "${current}" → "${newPaymentStatus}"`
            );
        }

        const won = await this.orderRepository.compareAndSetPaymentStatus({
            orderId,
            portalId,
            from: current,
            to: newPaymentStatus,
            employeeId,
        });
        if (!won) {
            // Ноль обновлённых строк — статус увели из-под нас. Отдаём 409, чтобы
            // клиент перечитал заказ, а не считал, что его переход применился.
            throw new ConflictException(
                "Статус оплаты изменён параллельным запросом — обновите заказ"
            );
        }

        this.logger.log(`💳 Заказ ${order.orderNumber}: оплата ${current} → ${newPaymentStatus}`);

        return this.findByIdForPortalOrFail(orderId, portalId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Cancel Order (Member)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Отменить заказ (инициировано членом клуба). Только пока заказ в стадии «новый»:
     * дальше клуб уже взял его в работу.
     */
    async cancelOrderByMember(
        orderId: string,
        memberId: string,
        portalId: string,
        reason?: string
    ): Promise<Order> {
        const order = await this.findByIdForPortalOrFail(orderId, portalId);

        // Проверить, что заказ принадлежит этому члену
        if (order.memberId !== memberId) {
            throw new ForbiddenException("Нет доступа к этому заказу");
        }

        if (order.stage && order.stage.semantic !== StageSemantic.NEW) {
            throw new BadRequestException(
                "Отмена невозможна: клуб уже взял заказ в работу. Отменить можно только новый заказ"
            );
        }

        const stages = await this.orderRepository.findFunnelStages(
            portalId,
            order.stage?.stageCategoryId
        );
        const cancelStage = stages.find(isFailureStage);
        if (!cancelStage) {
            throw new BadRequestException("В воронке заказа нет стадии отмены");
        }

        const updated = await this.applyStage(order, cancelStage, portalId, {
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
    private async resolveOrderItems(
        items: NewOrderItem[],
        portalId: string
    ): Promise<ResolvedOrderItem[]> {
        const resolved: ResolvedOrderItem[] = [];

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

            const unitPrice = item.unitPrice ?? Number(product.price);
            const isGift = item.isGift ?? false;
            const totalPrice = isGift ? 0 : +(unitPrice * item.quantity).toFixed(2);

            resolved.push({
                productId: item.productId,
                name: product.name,
                quantity: item.quantity,
                unitPrice,
                totalPrice,
                isGift,
                notes: item.notes,
            });
        }

        return resolved;
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
}
