import { type ContentLocale, resolveLabel } from "@common/i18n";
import {
    CabinetOrderDetailDto,
    CabinetOrderListDto,
    CabinetOrderStageDto,
} from "@modules/portal/crm/orders/api/dto/cabinet-order.dto";
import { Order } from "@modules/portal/crm/orders/domain/entity/order.entity";
import type { OrderStage } from "@modules/portal/crm/orders/domain/entity/order-stage.entity";
import { memberMayCancel } from "@modules/portal/crm/orders/domain/order-stage.rules";

/** Стадия глазами участника: как её назвал клуб, на языке запроса. */
const toCabinetStage = (
    stage: Pick<OrderStage, "id" | "name" | "nameI18n" | "color" | "semantic">,
    locale: ContentLocale
): CabinetOrderStageDto => ({
    id: stage.id,
    name: resolveLabel({ label: stage.name, labelI18n: stage.nameI18n }, locale),
    color: stage.color,
    semantic: stage.semantic,
});

export function mapOrderToCabinetListDto(o: Order, locale: ContentLocale): CabinetOrderListDto {
    return {
        id: o.id,
        orderNumber: o.orderNumber,
        stage: o.stage ? toCabinetStage(o.stage, locale) : null,
        paymentStatus: o.paymentStatus,
        total: Number(o.total),
        itemsCount: o.items?.length ?? 0,
        orderedAt: o.orderedAt.toISOString(),
        canCancel: memberMayCancel(o.stage),
    };
}

/** `funnel` — стадии воронки заказа по порядку: из них кабинет рисует полосу стадий. */
export function mapOrderToCabinetDetailDto(
    o: Order,
    locale: ContentLocale,
    funnel: readonly OrderStage[]
): CabinetOrderDetailDto {
    return {
        ...mapOrderToCabinetListDto(o, locale),
        funnel: funnel.map((stage) => toCabinetStage(stage, locale)),
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        netTotal: o.netTotal != null ? Number(o.netTotal) : null,
        taxTotal: o.taxTotal != null ? Number(o.taxTotal) : null,
        notes: o.notes ?? null,
        items:
            o.items?.map((item) => ({
                id: item.id,
                productId: item.productId,
                name: item.product?.name ?? "—",
                imageUrl: item.product?.imageUrl ?? null,
                unitCode: item.product?.measurementUnit?.code ?? null,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
                isGift: item.isGift,
            })) ?? [],
        completedAt: o.completedAt?.toISOString() ?? null,
        cancelledAt: o.cancelledAt?.toISOString() ?? null,
    };
}
