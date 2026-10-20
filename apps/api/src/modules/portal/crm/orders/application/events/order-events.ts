import type { EventActor } from "@workspace/domain-events";

import { employeeActor, memberActor, type NewDomainEvent } from "@modules/events";

import type { Order } from "../../domain/entity/order.entity";
import type { OrderStage } from "../../domain/entity/order-stage.entity";
import { isFailureStage } from "../../domain/order-stage.rules";
import type { StockLine } from "../../domain/repositories/order-repository.interface";

/*
 * События заказа (каталог: packages/domain-events/src/catalog/order.events.ts). Собираются здесь,
 * в одном месте, а пишутся репозиторием в транзакции изменения. Суммы в события не попадают.
 */

type StockReason = "order_placed" | "order_cancelled";

const stockEvents = (
    portalId: string,
    actor: EventActor,
    lines: readonly Pick<StockLine, "productId">[],
    reason: StockReason,
    orderId: string
): NewDomainEvent[] =>
    [...new Set(lines.map((line) => line.productId))].map((productId) => ({
        name: "product.stock_changed",
        portalId,
        actor,
        aggregateId: productId,
        payload: { productId, reason, orderId },
    }));

/** Кто оформил: сотрудник на стойке или сам участник из кабинета. */
const placedBy = (order: Order): EventActor =>
    order.employeeId ? employeeActor(order.employeeId) : memberActor(order.memberId);

/** Новый заказ и списание его товаров со склада. */
export const orderPlacedEvents = (portalId: string, order: Order): NewDomainEvent[] => {
    const actor = placedBy(order);
    return [
        {
            name: "order.placed",
            portalId,
            actor,
            aggregateId: order.id,
            payload: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                memberId: order.memberId,
                employeeId: order.employeeId ?? null,
                stageId: order.stage?.id ?? null,
                itemCount: order.items?.length ?? 0,
            },
        },
        ...stockEvents(portalId, actor, order.items ?? [], "order_placed", order.id),
    ];
};

/**
 * Переход стадии. Переход в стадию отказа — ещё и отмена, а возвращённый товар — движение склада.
 */
export const orderStageChangedEvents = (
    portalId: string,
    order: Order,
    target: OrderStage,
    actor: EventActor,
    restock: readonly StockLine[] | undefined
): NewDomainEvent[] => {
    const events: NewDomainEvent[] = [
        {
            name: "order.stage_changed",
            portalId,
            actor,
            aggregateId: order.id,
            payload: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                memberId: order.memberId,
                fromStageId: order.stage?.id ?? null,
                toStageId: target.id,
                toStageSemantic: target.semantic,
                employeeId: actor.kind === "employee" ? actor.id : null,
            },
        },
    ];
    if (isFailureStage(target)) {
        events.push({
            name: "order.cancelled",
            portalId,
            actor,
            aggregateId: order.id,
            payload: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                memberId: order.memberId,
                cancelledBy: actor.kind === "member" ? "member" : "staff",
            },
        });
    }
    if (restock?.length) {
        events.push(...stockEvents(portalId, actor, restock, "order_cancelled", order.id));
    }
    return events;
};

export const orderPaymentChangedEvent = (
    portalId: string,
    order: Order,
    to: string,
    employeeId: string
): NewDomainEvent => ({
    name: "order.payment_changed",
    portalId,
    actor: employeeActor(employeeId),
    aggregateId: order.id,
    payload: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        memberId: order.memberId,
        from: order.paymentStatus,
        to,
        employeeId,
    },
});
