import { Injectable } from "@nestjs/common";

import type { Prisma, TaxTreatment } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { PaymentStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";
import { isFailureStage } from "@modules/portal/crm/orders/domain/order-stage.rules";

import type { LedgerLine } from "../../domain/ledger/ledger-entry";
import { toCents } from "../../domain/ledger/ledger-money";
import {
    type OrderSale,
    OrderSaleSource,
} from "../../domain/repositories/finance-sources.interface";

/** Статус оплаты хранится строкой; сравнение — со значением перечисления заказов. */
const PAID: string = PaymentStatus.PAID;

interface SaleItem {
    totalPrice: Prisma.Decimal;
    isGift: boolean;
    taxPercent: Prisma.Decimal | null;
    taxTreatment: TaxTreatment | null;
    netAmount: Prisma.Decimal | null;
    taxAmount: Prisma.Decimal | null;
}

const lineOf = (item: SaleItem): LedgerLine =>
    item.taxTreatment !== null && item.netAmount !== null && item.taxAmount !== null
        ? {
              percent: Number(item.taxPercent ?? 0),
              treatment: item.taxTreatment,
              net: toCents(Number(item.netAmount)),
              tax: toCents(Number(item.taxAmount)),
          }
        : { percent: 0, treatment: null, net: toCents(Number(item.totalPrice)), tax: 0 };

/**
 * Строки проводки из строк заказа: одна строка на ставку (21 % и 10 % в одном заказе — две
 * строки), подарки не входят. Строки без снимка налога (заказ до включения финансов) — одна
 * строка без разбивки. Скидок у заказов нет: сумма строк равна итогу заказа.
 */
export const saleLines = (items: readonly SaleItem[]): LedgerLine[] => {
    const lines = new Map<string, LedgerLine>();
    for (const item of items) {
        if (item.isGift) continue;
        const line = lineOf(item);
        const key = `${line.treatment ?? "none"}:${line.percent}`;
        const sum = lines.get(key);
        lines.set(key, sum ? { ...sum, net: sum.net + line.net, tax: sum.tax + line.tax } : line);
    }
    return [...lines.values()].filter((line) => line.net !== 0 || line.tax !== 0);
};

@Injectable()
export class OrderSalePrismaSource extends OrderSaleSource {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async saleOf(portalId: string, orderId: string): Promise<OrderSale | null> {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, portalId },
            select: {
                id: true,
                orderNumber: true,
                memberId: true,
                paymentStatus: true,
                entityRecord: {
                    select: {
                        stage: {
                            select: {
                                semantic: true,
                                isTerminalSuccess: true,
                                isTerminalFailure: true,
                            },
                        },
                    },
                },
                items: {
                    select: {
                        totalPrice: true,
                        isGift: true,
                        taxPercent: true,
                        taxTreatment: true,
                        netAmount: true,
                        taxAmount: true,
                    },
                },
            },
        });
        if (!order) return null;
        const stage = order.entityRecord.stage;
        return {
            orderId: order.id,
            orderNumber: order.orderNumber,
            memberId: order.memberId,
            paid: order.paymentStatus === PAID,
            cancelled: stage ? isFailureStage(stage) : false,
            lines: saleLines(order.items),
        };
    }
}
