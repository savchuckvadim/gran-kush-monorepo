import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { isUniqueViolationOn } from "@common/prisma/unique-violation";
import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { MemberLimitService } from "@modules/portal/crm/club-policy/application/services/member-limit.service";
import { TaxPolicyService } from "@modules/portal/crm/finance/application/services/tax-policy.service";
import { splitLineTax, sumLineTaxes } from "@modules/portal/crm/finance/domain/tax/tax-split";
import { Order, PaymentStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";
import { InsufficientStockError } from "@modules/portal/crm/orders/domain/errors/insufficient-stock.error";
import { MonthlyLimitExceededError } from "@modules/portal/crm/orders/domain/errors/monthly-limit-exceeded.error";
import { itemLimitGrams } from "@modules/portal/crm/orders/domain/monthly-limit";
import {
    CreateOrderInput,
    CreateOrderItemInput,
    OrderRepository,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

import { orderPlacedEvents } from "../events/order-events";

/** Сколько раз подбирать свободный номер заказа, прежде чем сдаться */
const ORDER_NUMBER_MAX_ATTEMPTS = 5;

/** `ORD-20260316-` — дата всегда в UTC, чтобы нумерация не зависела от таймзоны сервера */
const buildOrderNumberPrefix = (date: Date): string =>
    `ORD-${date.toISOString().slice(0, 10).replace(/-/g, "")}-`;

/** Конфликт по уникальному индексу `(portal_id, order_number)` */
const isOrderNumberConflict = (error: unknown): boolean =>
    isUniqueViolationOn(error, "order_number");

/** Код отказа, когда заказ превысил бы лимит участника; рядом — `remainingGrams`. */
export const MONTHLY_LIMIT_EXCEEDED = "monthly_limit_exceeded";

/** Позиция нового заказа. Цену и подарок задаёт только сотрудник CRM — у участника их нет */
export interface NewOrderItem {
    productId: string;
    quantity: number;
    notes?: string;
    unitPrice?: number;
    isGift?: boolean;
}

export interface PlaceOrderInput {
    memberId: string;
    items: NewOrderItem[];
    notes?: string;
    /** Сотрудник CRM, оформивший заказ; заказ из кабинета — без него */
    employeeId?: string;
    /** Стадия воронки; без неё — первая рабочая стадия воронки по умолчанию */
    stageId?: string;
}

/** Позиция, проверенная по каталогу; имя — для понятной ошибки, если товар кончится */
interface ResolvedOrderItem extends CreateOrderItemInput {
    name: string;
    taxRateId: string | null;
    priceIncludesTax: boolean | null;
}

/**
 * Общее ядро оформления заказа для кабинета и CRM: проверить товары, посчитать суммы и граммы
 * лимита, выдать номер и одной транзакцией создать заказ, проверить лимит участника и списать
 * товар. Правила того, кто и что может
 * заказать, — в сценариях `use-cases/place-*-order.use-case.ts`.
 */
@Injectable()
export class OrderPlacementService {
    private readonly logger = new Logger(OrderPlacementService.name);

    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly productsService: ProductsService,
        private readonly memberLimits: MemberLimitService,
        private readonly taxPolicy: TaxPolicyService
    ) {}

    async place(portalId: string, input: PlaceOrderInput): Promise<Order> {
        const { memberId, employeeId } = input;
        const resolvedItems = await this.resolveOrderItems(input.items, portalId);
        const taxed = await this.applyTaxes(portalId, resolvedItems);

        const subtotal = +taxed.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2);
        const discount = 0; // скидок в продукте пока нет
        const total = subtotal - discount;
        const { limitGrams } = await this.memberLimits.settingsOf(memberId, portalId);

        let order: Order;
        try {
            order = await this.createWithGeneratedOrderNumber(portalId, {
                memberId,
                employeeId,
                paymentStatus: PaymentStatus.PENDING,
                subtotal,
                discount,
                total,
                netTotal: taxed.netTotal,
                taxTotal: taxed.taxTotal,
                notes: input.notes,
                items: taxed.items,
                stageId: input.stageId,
                monthlyLimitGrams: limitGrams,
            });
        } catch (error) {
            if (error instanceof MonthlyLimitExceededError) {
                throw new BadRequestException({
                    message: error.message,
                    code: MONTHLY_LIMIT_EXCEEDED,
                    remainingGrams: error.remainingGrams,
                });
            }
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

    /** Проверить товары и остатки, посчитать цены позиций. */
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
            if (product.isConsumable) {
                throw new BadRequestException(
                    `Товар "${product.name}" — расходник: его списывают со склада, а не продают`
                );
            }
            if (product.currentQuantity.lessThan(new Prisma.Decimal(item.quantity))) {
                throw new BadRequestException(
                    `Недостаточно товара "${product.name}". ` +
                        `Доступно: ${product.currentQuantity.toString()}, запрошено: ${item.quantity}`
                );
            }

            const unitPrice = item.unitPrice ?? Number(product.price);
            const isGift = item.isGift ?? false;
            resolved.push({
                productId: item.productId,
                name: product.name,
                quantity: item.quantity,
                unitPrice,
                totalPrice: isGift ? 0 : +(unitPrice * item.quantity).toFixed(2),
                isGift,
                notes: item.notes,
                limitGrams: itemLimitGrams(
                    item.quantity,
                    product.limitGramsPerUnit != null ? Number(product.limitGramsPerUnit) : null
                ),
                taxRateId: product.taxRateId ?? null,
                priceIncludesTax: product.priceIncludesTax ?? null,
            });
        }

        return resolved;
    }

    /**
     * Налог строк по правилам клуба (TASK-797): снимок ставки в строке, база и налог — в заказе.
     * У товара «без налога» налог добавляется сверху, итог строки больше цены × количество.
     * Финансы клуба выключены — заказ без разбивки, суммы как раньше.
     */
    private async applyTaxes(
        portalId: string,
        items: readonly ResolvedOrderItem[]
    ): Promise<{ items: ResolvedOrderItem[]; netTotal: number | null; taxTotal: number | null }> {
        const rules = await this.taxPolicy.rulesFor(
            portalId,
            items.map((item) => ({
                id: item.productId,
                taxRateId: item.taxRateId,
                priceIncludesTax: item.priceIncludesTax,
            }))
        );
        if (!rules) return { items: [...items], netTotal: null, taxTotal: null };

        const taxed = items.map((item) => {
            const rule = rules.get(item.productId);
            if (!rule) return item;
            const line = splitLineTax(item.totalPrice, rule);
            return {
                ...item,
                totalPrice: line.gross,
                tax: {
                    percent: rule.percent,
                    treatment: rule.treatment,
                    net: line.net,
                    tax: line.tax,
                },
            };
        });
        const totals = sumLineTaxes(
            taxed.map((item) => ({
                net: item.tax?.net ?? item.totalPrice,
                tax: item.tax?.tax ?? 0,
                gross: item.totalPrice,
            }))
        );
        return { items: taxed, netTotal: totals.net, taxTotal: totals.tax };
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
                return await this.orderRepository.create({ ...input, orderNumber }, (order) =>
                    orderPlacedEvents(portalId, order)
                );
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
     * Номер заказа ORD-YYYYMMDD-NNNN. Нумерация ведётся отдельно в каждом портале — номера
     * одного клуба не выдают объём другого.
     */
    private async generateOrderNumber(portalId: string): Promise<string> {
        const prefix = buildOrderNumberPrefix(new Date());
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
