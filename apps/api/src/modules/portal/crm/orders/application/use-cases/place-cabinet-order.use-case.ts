import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { MemberAccessService } from "@modules/portal/crm/club-policy/application/services/member-access.service";
import { Order } from "@modules/portal/crm/orders/domain/entity/order.entity";

import { OrderPlacementService } from "../services/order-placement.service";

/** Коды отказа, которые кабинет переводит сам: сообщение API — для журнала. */
export const CABINET_ORDER_ERRORS = {
    productUnavailable: "product_unavailable",
    insufficientStock: "insufficient_stock",
} as const;

export interface PlaceCabinetOrderCommand {
    items: { productId: string; quantity: number; notes?: string }[];
    notes?: string;
}

/**
 * Участник оформляет заказ из кабинета. Правила сценария поверх общего оформления
 * (`OrderPlacementService`); открыт ли заказ вообще, уже решил `RequireShopAccess("order")`:
 * - товар, который клуб не показывает аудиториям участника, для него не существует — как и на
 *   витрине, иначе скрытый товар заказывался бы по id;
 * - нехватку товара участник видит без точного остатка: склад клуба ему не раскрывается.
 * Остаток всё равно атомарно проверяет транзакция заказа; здесь — понятный отказ до неё.
 */
@Injectable()
export class PlaceCabinetOrderUseCase {
    constructor(
        private readonly placement: OrderPlacementService,
        private readonly products: ProductsService,
        private readonly access: MemberAccessService
    ) {}

    async execute(
        memberId: string,
        portalId: string,
        command: PlaceCabinetOrderCommand
    ): Promise<Order> {
        const audiences = await this.access.audiencesOf(memberId, portalId);

        const requested = new Map<string, number>();
        for (const item of command.items) {
            requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
        }

        for (const [productId, quantity] of requested) {
            const product = await this.products.findForShop(productId, portalId, audiences);
            if (!product) {
                throw new NotFoundException({
                    message: "Product not found or not available",
                    code: CABINET_ORDER_ERRORS.productUnavailable,
                });
            }
            if (product.currentQuantity.lessThan(quantity)) {
                throw new BadRequestException({
                    message: `Not enough "${product.name}" in stock`,
                    code: CABINET_ORDER_ERRORS.insufficientStock,
                });
            }
        }

        return this.placement.place(portalId, {
            memberId,
            items: command.items,
            notes: command.notes,
        });
    }
}
