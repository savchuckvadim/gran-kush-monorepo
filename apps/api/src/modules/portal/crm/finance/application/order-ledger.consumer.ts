import { Injectable } from "@nestjs/common";

import type { DomainEvent } from "@workspace/domain-events";

import { OnDomainEvent } from "@modules/events";
import { PortalModulesService } from "@modules/portal/crm/portal-modules/application/portal-modules.service";

import { ReconcileOrderSaleUseCase } from "./use-cases/reconcile-order-sale.use-case";

/**
 * Финансы слушают заказы: оплата, возврат и отмена меняют проводки заказа. Без модуля финансов
 * клуб учёт не ведёт — событие пропускается.
 */
@Injectable()
export class OrderLedgerConsumer {
    constructor(
        private readonly modules: PortalModulesService,
        private readonly reconcile: ReconcileOrderSaleUseCase
    ) {}

    @OnDomainEvent("order.payment_changed", "order.stage_changed")
    async onOrderEvent(event: DomainEvent): Promise<void> {
        if (event.name !== "order.payment_changed" && event.name !== "order.stage_changed") return;
        const portalId = event.portalId;
        if (!portalId || !(await this.modules.isEnabled(portalId, "finance"))) return;
        await this.reconcile.execute(
            portalId,
            event.payload.orderId,
            new Date(event.occurredAt),
            event.actor
        );
    }
}
