import { OrderDetailDto, OrderListDto } from "@orders/api/dto/order.dto";
import { Order } from "@orders/domain/entity/order.entity";

/**
 * Маппинг Order entity → OrderListDto (для списка заказов)
 */
export function mapOrderToListDto(o: Order): OrderListDto {
    return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        total: Number(o.total),
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
export function mapOrderToDetailDto(o: Order): OrderDetailDto {
    return {
        ...mapOrderToListDto(o),
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
                notes: item.notes,
                product: item.product ?? {
                    id: item.productId,
                    name: "—",
                },
            })) ?? [],
        updatedAt: o.updatedAt.toISOString(),
    };
}
