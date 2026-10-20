import type { DomainEvent } from "@workspace/domain-events";

import { NOTIFICATION_TYPES, type NotificationDraft, type NotificationLabel } from "./notification";

/** Кому слать: персоналу клуба с правом (кроме того, кто сделал) или участнику заказа. */
export type RecipientRule = { staffWith: string; except: string | null } | { member: string };

export interface NotificationPlan {
    draft: NotificationDraft;
    to: RecipientRule;
}

const ORDERS_READ = "orders.read";

/** Что известно правилу сверх события: название клуба и стадии на языках клуба. */
export interface OrderNotificationContext {
    club: string;
    stage?: NotificationLabel | null;
}

const draft = (
    event: DomainEvent,
    type: NotificationDraft["type"],
    orderId: string,
    params: NotificationDraft["params"]
): NotificationDraft => ({
    portalId: event.portalId ?? "",
    eventId: event.id,
    type,
    subject: { kind: "order", id: orderId },
    params,
});

/**
 * Уведомления о заказах (TASK-781, «оповещения по заказам очень нужны»):
 *
 * - заказ из кабинета → персоналу с `orders.read`; заказ, оформленный на стойке, — никому:
 *   его видел сотрудник, который оформлял;
 * - участник отменил заказ → персоналу; клуб отменил → участнику;
 * - сотрудник перевёл заказ на другую стадию → участнику (стадия — словом клуба).
 */
export const orderNotificationPlans = (
    event: DomainEvent,
    context: OrderNotificationContext
): NotificationPlan[] => {
    const club = context.club;
    switch (event.name) {
        case "order.placed": {
            const { orderId, orderNumber, employeeId, itemCount } = event.payload;
            if (employeeId !== null) return [];
            return [
                {
                    draft: draft(event, NOTIFICATION_TYPES.orderPlaced, orderId, {
                        orderNumber,
                        itemCount,
                        club,
                    }),
                    to: { staffWith: ORDERS_READ, except: null },
                },
            ];
        }
        case "order.cancelled": {
            const { orderId, orderNumber, memberId, cancelledBy } = event.payload;
            if (cancelledBy === "member") {
                return [
                    {
                        draft: draft(event, NOTIFICATION_TYPES.orderCancelledByMember, orderId, {
                            orderNumber,
                            club,
                        }),
                        to: { staffWith: ORDERS_READ, except: null },
                    },
                ];
            }
            return [
                {
                    draft: draft(event, NOTIFICATION_TYPES.orderCancelledByStaff, orderId, {
                        orderNumber,
                        club,
                    }),
                    to: { member: memberId },
                },
            ];
        }
        case "order.stage_changed": {
            const { orderId, orderNumber, memberId, employeeId, toStageSemantic } = event.payload;
            // отмену участник получает отдельным уведомлением об отмене
            if (employeeId === null || toStageSemantic === "FAILURE" || !context.stage) return [];
            return [
                {
                    draft: draft(event, NOTIFICATION_TYPES.orderStageChanged, orderId, {
                        orderNumber,
                        club,
                        stage: context.stage,
                        semantic: toStageSemantic,
                    }),
                    to: { member: memberId },
                },
            ];
        }
        default:
            return [];
    }
};
