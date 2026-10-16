import { type ContentLocale, resolveLabel } from "@common/i18n";
import {
    CabinetOrderDetailDto,
    CabinetOrderListDto,
} from "@modules/portal/crm/orders/api/dto/cabinet-order.dto";
import { Order } from "@modules/portal/crm/orders/domain/entity/order.entity";
import { memberMayCancel } from "@modules/portal/crm/orders/domain/order-stage.rules";

export function mapOrderToCabinetListDto(o: Order, locale: ContentLocale): CabinetOrderListDto {
    return {
        id: o.id,
        orderNumber: o.orderNumber,
        stage: o.stage
            ? {
                  id: o.stage.id,
                  name: resolveLabel({ label: o.stage.name, labelI18n: o.stage.nameI18n }, locale),
                  color: o.stage.color,
                  semantic: o.stage.semantic,
              }
            : null,
        paymentStatus: o.paymentStatus,
        total: Number(o.total),
        itemsCount: o.items?.length ?? 0,
        orderedAt: o.orderedAt.toISOString(),
        canCancel: memberMayCancel(o.stage),
    };
}

export function mapOrderToCabinetDetailDto(o: Order, locale: ContentLocale): CabinetOrderDetailDto {
    return {
        ...mapOrderToCabinetListDto(o, locale),
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
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
