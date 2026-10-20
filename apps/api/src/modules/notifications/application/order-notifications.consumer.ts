import { Injectable } from "@nestjs/common";

import type { DomainEvent } from "@workspace/domain-events";

import { OnDomainEvent } from "@modules/events";

import type { NewNotification, NotificationRecipient } from "../domain/notification";
import { NotificationDirectory } from "../domain/notification-directory.interface";
import { NotificationRepository } from "../domain/notification-repository.interface";
import { orderNotificationPlans, type RecipientRule } from "../domain/order-notification-rules";

/**
 * Уведомления о заказах: правила — в `order-notification-rules.ts`, здесь — адресаты клуба и
 * запись. Повтор доставки не дублирует: (событие, адресат) уникальны в хранилище.
 */
@Injectable()
export class OrderNotificationsConsumer {
    constructor(
        private readonly directory: NotificationDirectory,
        private readonly repository: NotificationRepository
    ) {}

    @OnDomainEvent("order.placed", "order.cancelled", "order.stage_changed")
    async onOrderEvent(event: DomainEvent): Promise<void> {
        const portalId = event.portalId;
        if (!portalId) return;
        const stage =
            event.name === "order.stage_changed"
                ? await this.directory.orderStage(portalId, event.payload.toStageId)
                : null;
        const club = (await this.directory.clubName(portalId)) ?? "";
        const notifications: NewNotification[] = [];
        for (const plan of orderNotificationPlans(event, { club, stage })) {
            for (const recipient of await this.recipients(portalId, plan.to)) {
                notifications.push({ ...plan.draft, recipient });
            }
        }
        await this.repository.createMany(notifications);
    }

    private async recipients(
        portalId: string,
        rule: RecipientRule
    ): Promise<NotificationRecipient[]> {
        if ("member" in rule) {
            const member = await this.directory.member(portalId, rule.member);
            return member ? [{ kind: "member", memberId: member.memberId }] : [];
        }
        const staff = await this.directory.staffWithPermission(portalId, rule.staffWith);
        return staff
            .filter((employee) => employee.employeeId !== rule.except)
            .map((employee) => ({ kind: "employee", employeeId: employee.employeeId }));
    }
}
