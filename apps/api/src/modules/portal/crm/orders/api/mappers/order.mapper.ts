import { type ContentLocale, resolveLabel } from "@common/i18n";
import {
    OrderDetailDto,
    OrderListDto,
    OrderStageDto,
} from "@modules/portal/crm/orders/api/dto/order.dto";
import { Order } from "@modules/portal/crm/orders/domain/entity/order.entity";
import { OrderStage } from "@modules/portal/crm/orders/domain/entity/order-stage.entity";

const numberOrNull = (value: { toString(): string } | null | undefined): number | null =>
    value == null ? null : Number(value);

/** Стадия с названием на языке запроса: перевод системного названия или слово клуба. */
export function mapOrderStageToDto(stage: OrderStage, locale: ContentLocale): OrderStageDto {
    return {
        id: stage.id,
        stageCategoryId: stage.stageCategoryId,
        name: resolveLabel({ label: stage.name, labelI18n: stage.nameI18n }, locale),
        color: stage.color,
        semantic: stage.semantic,
        sortOrder: stage.sortOrder,
        isTerminalSuccess: stage.isTerminalSuccess,
        isTerminalFailure: stage.isTerminalFailure,
    };
}

/**
 * Маппинг Order entity → OrderListDto (для списка заказов)
 */
export function mapOrderToListDto(o: Order, locale: ContentLocale): OrderListDto {
    return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        stage: o.stage ? mapOrderStageToDto(o.stage, locale) : null,
        paymentStatus: o.paymentStatus,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        total: Number(o.total),
        netTotal: numberOrNull(o.netTotal),
        taxTotal: numberOrNull(o.taxTotal),
        itemsCount: o.items?.length ?? 0,
        orderedAt: o.orderedAt.toISOString(),
        member: o.member ?? { id: o.memberId, name: "—" },
        employee: o.employee ?? null,
        createdAt: o.createdAt.toISOString(),
    };
}

/**
 * Маппинг Order entity → OrderDetailDto (для деталки заказа)
 */
export function mapOrderToDetailDto(o: Order, locale: ContentLocale): OrderDetailDto {
    return {
        ...mapOrderToListDto(o, locale),
        notes: o.notes,
        adminNotes: o.adminNotes,
        confirmedAt: o.confirmedAt?.toISOString() ?? null,
        preparedAt: o.preparedAt?.toISOString() ?? null,
        readyAt: o.readyAt?.toISOString() ?? null,
        completedAt: o.completedAt?.toISOString() ?? null,
        cancelledAt: o.cancelledAt?.toISOString() ?? null,
        items:
            o.items?.map((item) => ({
                id: item.id,
                productId: item.productId,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
                isGift: item.isGift,
                taxPercent: numberOrNull(item.taxPercent),
                taxTreatment: item.taxTreatment ?? null,
                netAmount: numberOrNull(item.netAmount),
                taxAmount: numberOrNull(item.taxAmount),
                unitCost: numberOrNull(item.unitCost),
                notes: item.notes,
                product: item.product ?? {
                    id: item.productId,
                    name: "—",
                },
            })) ?? [],
        updatedAt: o.updatedAt.toISOString(),
    };
}
