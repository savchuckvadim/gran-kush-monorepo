import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import {
    Order,
    OrderStatus,
    PaymentStatus,
} from "@modules/portal/crm/orders/domain/entity/order.entity";
import {
    OrderFilters,
    OrderRepository,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

import { orderPaymentChangedEvent } from "../events/order-events";

/**
 * Машина состояний оплаты — только вперёд. Нужна не ради строгости, а потому что
 * поздно доставленный вебхук с `pending` иначе откатит уже наступившее `paid`.
 */
const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
    [PaymentStatus.PENDING]: [PaymentStatus.PAID],
    [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
    [PaymentStatus.REFUNDED]: [],
};

/**
 * Заказы клуба: чтение и оплата. Оформление — `OrderPlacementService` и сценарии в
 * `use-cases/`, стадии и отмена — `OrderStagesService`.
 */
@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(private readonly orderRepository: OrderRepository) {}

    async findById(id: string): Promise<Order | null> {
        return this.orderRepository.findById(id);
    }

    async findByIdForPortal(id: string, portalId: string): Promise<Order | null> {
        return this.orderRepository.findByIdForPortal(id, portalId);
    }

    async findByIdForPortalOrFail(id: string, portalId: string): Promise<Order> {
        const order = await this.orderRepository.findByIdForPortal(id, portalId);
        if (!order) {
            throw new NotFoundException(`Заказ с ID "${id}" не найден`);
        }
        return order;
    }

    async findAll(
        filters?: OrderFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<Order[]> {
        return this.orderRepository.findAll(filters, limit, skip, sortBy, sortOrder);
    }

    async count(filters?: OrderFilters): Promise<number> {
        return this.orderRepository.count(filters);
    }

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
            events: [orderPaymentChangedEvent(portalId, order, newPaymentStatus, employeeId)],
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
}
