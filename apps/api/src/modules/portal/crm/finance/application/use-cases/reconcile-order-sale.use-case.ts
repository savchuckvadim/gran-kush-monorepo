import { Injectable, Logger } from "@nestjs/common";

import type { EventActor } from "@workspace/domain-events";
import { randomUUID } from "crypto";

import { localDate, monthOf } from "../../domain/ledger/finance-period";
import { reversalEntry } from "../../domain/ledger/ledger-reversal";
import { activeSale, nextSaleSourceId, orderSaleEntry } from "../../domain/ledger/order-sale";
import { CounterpartyRepository } from "../../domain/repositories/counterparty-repository.interface";
import { FinancePeriodRepository } from "../../domain/repositories/finance-period-repository.interface";
import {
    FinanceDirectory,
    type OrderSale,
    OrderSaleSource,
} from "../../domain/repositories/finance-sources.interface";
import {
    LedgerRepository,
    type LedgerWrite,
} from "../../domain/repositories/ledger-repository.interface";
import { LEDGER_CURRENCY } from "../../finance.limits";
import { entryRecordedEvent } from "../events/ledger-events";
import { FinanceCategoriesService } from "../services/finance-categories.service";

/**
 * Проводки оплаты заказа следуют за заказом. Сверяется состояние заказа, а не событие: повтор
 * доставки и любой порядок событий дают один итог.
 * - оплаченный и не отменённый заказ — одна действующая продажа: доход по статье `sales`, строки
 *   налога — снимок заказа, контрагент — участник, счёт — касса;
 * - возврат оплаты или отмена заказа — сторно действующей продажи;
 * - заказ снова оплачен или вернулся из отмены — новая продажа (`<orderId>#2`…);
 * - дата — день события по часовому поясу клуба; если тот месяц уже закрыт — сегодня.
 */
@Injectable()
export class ReconcileOrderSaleUseCase {
    private readonly logger = new Logger(ReconcileOrderSaleUseCase.name);

    constructor(
        private readonly ledger: LedgerRepository,
        private readonly sales: OrderSaleSource,
        private readonly categories: FinanceCategoriesService,
        private readonly counterparties: CounterpartyRepository,
        private readonly periods: FinancePeriodRepository,
        private readonly directory: FinanceDirectory
    ) {}

    async execute(portalId: string, orderId: string, at: Date, actor: EventActor): Promise<void> {
        await this.ledger.reconcileOrderSale(portalId, orderId, async (entries) => {
            const sale = await this.sales.saleOf(portalId, orderId);
            if (!sale) return null;
            const active = activeSale(entries);
            const wanted = sale.paid && !sale.cancelled && sale.lines.length > 0;
            if (wanted === (active !== null)) return null;
            const occurredOn = await this.entryDate(portalId, at);
            if (active) {
                const reversal = reversalEntry(active, randomUUID(), occurredOn, null);
                return {
                    entries: [reversal],
                    events: [entryRecordedEvent(portalId, reversal, actor)],
                };
            }
            return this.saleWrite(
                portalId,
                sale,
                nextSaleSourceId(orderId, entries),
                occurredOn,
                actor
            );
        });
    }

    private async saleWrite(
        portalId: string,
        sale: OrderSale,
        sourceId: string,
        occurredOn: string,
        actor: EventActor
    ): Promise<LedgerWrite | null> {
        const category = await this.categories.orderSaleCategory(portalId);
        if (!category) {
            this.logger.warn(
                `Portal ${portalId} has no sales category: order ${sale.orderId} skipped`
            );
            return null;
        }
        const counterparty = await this.counterparties.forMember(portalId, sale.memberId);
        const entry = orderSaleEntry(
            sale,
            {
                id: randomUUID(),
                sourceId,
                categoryId: category.id,
                counterpartyId: counterparty.id,
            },
            occurredOn,
            LEDGER_CURRENCY
        );
        return { entries: [entry], events: [entryRecordedEvent(portalId, entry, actor)] };
    }

    private async entryDate(portalId: string, at: Date): Promise<string> {
        const timeZone = await this.directory.timeZone(portalId);
        const date = localDate(at, timeZone);
        const period = await this.periods.find(portalId, monthOf(date));
        return period?.closedAt ? localDate(new Date(), timeZone) : date;
    }
}
