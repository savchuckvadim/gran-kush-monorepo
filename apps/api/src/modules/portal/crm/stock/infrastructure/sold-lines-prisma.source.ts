import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import { PaymentStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";

import type { SoldLine } from "../domain/margin";
import { SoldLinesSource } from "../domain/sold-lines.source";

const CENTS = 100;
/** Статус оплаты заказа хранится строкой; сравнение — со значением перечисления заказов. */
const PAID: string = PaymentStatus.PAID;

/**
 * Проданные строки — оплаченные заказы периода без подарков. Выручка без налога — из снимка
 * строки; у заказа без разбивки (финансы были выключены) — вся цена строки.
 */
@Injectable()
export class SoldLinesPrismaSource extends SoldLinesSource {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async soldBetween(portalId: string, from: Date, to: Date): Promise<SoldLine[]> {
        const items = await this.prisma.orderItem.findMany({
            where: {
                isGift: false,
                order: { portalId, paymentStatus: PAID, orderedAt: { gte: from, lte: to } },
            },
            select: {
                quantity: true,
                totalPrice: true,
                netAmount: true,
                unitCost: true,
                product: {
                    select: {
                        id: true,
                        name: true,
                        category: { select: { id: true, name: true } },
                    },
                },
            },
        });
        return items.map((item) => {
            const quantity = Number(item.quantity);
            return {
                productId: item.product.id,
                productName: item.product.name,
                categoryId: item.product.category.id,
                categoryName: item.product.category.name,
                quantity,
                revenue: Math.round(Number(item.netAmount ?? item.totalPrice) * CENTS),
                cost:
                    item.unitCost === null
                        ? null
                        : Math.round(Number(item.unitCost) * quantity * CENTS),
            };
        });
    }
}
