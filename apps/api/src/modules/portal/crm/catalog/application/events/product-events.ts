import { employeeActor, type NewDomainEvent } from "@modules/events";

/*
 * События каталога (packages/domain-events/src/catalog/product.events.ts). Цены и остатки в
 * события не попадают: витрина и CRM перечитывают товар своими запросами.
 */

type ProductChange = "created" | "updated" | "deleted";

/**
 * Сотрудник изменил товар. Правка остатка руками — ещё и движение склада: витрина участника
 * узнаёт, что товар мог закончиться или появиться.
 */
export const productChangedEvents = (
    portalId: string,
    productId: string,
    change: ProductChange,
    employeeId: string,
    options: { stockChanged?: boolean } = {}
): NewDomainEvent[] => {
    const actor = employeeActor(employeeId);
    const events: NewDomainEvent[] = [
        {
            name: "product.changed",
            portalId,
            actor,
            aggregateId: productId,
            payload: { productId, change },
        },
    ];
    if (options.stockChanged) {
        events.push({
            name: "product.stock_changed",
            portalId,
            actor,
            aggregateId: productId,
            payload: { productId, reason: "manual", orderId: null },
        });
    }
    return events;
};
