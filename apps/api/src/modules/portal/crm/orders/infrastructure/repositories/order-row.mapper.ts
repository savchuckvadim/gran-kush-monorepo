import { Prisma } from "@prisma/client";

import {
    buildMemberFieldMap,
    type FieldRow,
    getMemberDisplayNameParts,
} from "@modules/portal/crm/entity-fields/lib/member-field-values";
import {
    Order,
    OrderItem,
    PaymentStatus,
} from "@modules/portal/crm/orders/domain/entity/order.entity";
import { legacyStatusOf } from "@modules/portal/crm/orders/domain/order-stage.rules";
import {
    ORDER_INCLUDE,
    toOrderStage,
} from "@modules/portal/crm/orders/infrastructure/prisma-includes";

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

const PAYMENT_STATUS_VALUES: ReadonlySet<string> = new Set(Object.values(PaymentStatus));

const isPaymentStatus = (raw: string): raw is PaymentStatus => PAYMENT_STATUS_VALUES.has(raw);

const coercePaymentStatus = (raw: string): PaymentStatus =>
    isPaymentStatus(raw) ? raw : PaymentStatus.PENDING;

/** Строка заказа из БД → доменный заказ: стадия, старый статус, имена участника и сотрудника из EAV. */
export const toOrderEntity = (row: OrderWithRelations): Order => {
    const stage = row.entityRecord.stage ? toOrderStage(row.entityRecord.stage) : null;

    const order = new Order({
        id: row.id,
        memberId: row.memberId,
        employeeId: row.employeeId,
        orderNumber: row.orderNumber,
        stage,
        status: legacyStatusOf(stage),
        paymentStatus: coercePaymentStatus(row.paymentStatus),
        subtotal: row.subtotal,
        discount: row.discount,
        total: row.total,
        orderedAt: row.orderedAt,
        confirmedAt: row.confirmedAt,
        preparedAt: row.preparedAt,
        readyAt: row.readyAt,
        completedAt: row.completedAt,
        cancelledAt: row.cancelledAt,
        notes: row.notes,
        adminNotes: row.adminNotes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    });

    if (row.member) {
        const fieldMap = buildMemberFieldMap(
            (row.member.profile?.fieldValues ?? []).map(
                (fv): FieldRow => ({
                    valueJson: fv.valueJson,
                    fieldDefinition: fv.fieldDefinition,
                })
            )
        );
        const { firstName, lastName } = getMemberDisplayNameParts(fieldMap);
        order.member = {
            id: row.member.id,
            name: firstName,
            surname: lastName,
            membershipNumber: row.member.membershipNumber,
        };
    }

    // Employee (имя — из профильных EAV-полей)
    if (row.employee) {
        const fieldMap = buildMemberFieldMap(
            (row.employee.profile?.fieldValues ?? []).map(
                (fv): FieldRow => ({
                    valueJson: fv.valueJson,
                    fieldDefinition: fv.fieldDefinition,
                })
            )
        );
        const { firstName, lastName } = getMemberDisplayNameParts(fieldMap);
        order.employee = {
            id: row.employee.id,
            name: firstName,
            surname: lastName,
        };
    }

    // Items
    if (row.items) {
        order.items = row.items.map(
            (item) =>
                new OrderItem({
                    id: item.id,
                    orderId: item.orderId,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    isGift: item.isGift,
                    notes: item.notes,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    product: item.product
                        ? {
                              id: item.product.id,
                              name: item.product.name,
                              sku: item.product.sku,
                              imageUrl: item.product.imageUrl,
                              measurementUnit: item.product.measurementUnit,
                          }
                        : undefined,
                })
        );
    }

    return order;
};
