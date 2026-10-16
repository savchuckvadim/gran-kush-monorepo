import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { MemberAccessService } from "@modules/portal/crm/club-policy/application/services/member-access.service";
import { CreateOrderDto } from "@modules/portal/crm/orders/api/dto/order.dto";
import { Order } from "@modules/portal/crm/orders/domain/entity/order.entity";

import { OrdersService } from "./orders.service";

/** Коды отказа, которые кабинет переводит сам: сообщение API — для журнала. */
export const CABINET_ORDER_ERRORS = {
    productUnavailable: "product_unavailable",
    insufficientStock: "insufficient_stock",
} as const;

/**
 * Заказ участника из кабинета. Поверх общих правил заказа (`OrdersService`):
 * - товар, который клуб не показывает аудиториям участника, для него не существует — как и на
 *   витрине, иначе скрытый товар заказывался бы по id;
 * - нехватку товара участник видит без точного остатка: склад клуба ему не раскрывается.
 * Остаток всё равно атомарно проверяет транзакция заказа; здесь — понятный отказ до неё.
 */
@Injectable()
export class CabinetOrderPlacementService {
    constructor(
        private readonly orders: OrdersService,
        private readonly products: ProductsService,
        private readonly access: MemberAccessService
    ) {}

    async place(memberId: string, portalId: string, dto: CreateOrderDto): Promise<Order> {
        const audiences = await this.access.audiencesOf(memberId, portalId);

        const requested = new Map<string, number>();
        for (const item of dto.items) {
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

        return this.orders.createOrder(memberId, dto, portalId);
    }
}
