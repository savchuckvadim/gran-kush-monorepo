import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import {
    buildMemberFieldMap,
    type FieldRow,
    getMemberDisplayNameParts,
} from "@modules/portal/crm/entity-fields/lib/member-field-values";
import {
    Order,
    OrderItem,
    OrderStatus,
    PaymentStatus,
} from "@modules/portal/crm/orders/domain/entity/order.entity";
import {
    CreateOrderInput,
    OrderFilters,
    OrderRepository,
    UpdateOrderInput,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";
import { ORDER_INCLUDE } from "@modules/portal/crm/orders/infrastructure/prisma-includes";

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

const ORDER_STATUS_VALUES = new Set<string>(Object.values(OrderStatus));
const PAYMENT_STATUS_VALUES = new Set<string>(Object.values(PaymentStatus));

function coerceOrderStatus(raw: string): OrderStatus {
    const v = raw.toLowerCase();
    return ORDER_STATUS_VALUES.has(v) ? (v as OrderStatus) : OrderStatus.PENDING;
}

function coercePaymentStatus(raw: string): PaymentStatus {
    return PAYMENT_STATUS_VALUES.has(raw) ? (raw as PaymentStatus) : PaymentStatus.PENDING;
}

@Injectable()
export class OrderPrismaRepository extends OrderRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    // ─── Поиск по ID ─────────────────────────────────────────────────────────

    async findById(id: string): Promise<Order | null> {
        const row = await this.prisma.order.findUnique({
            where: { id },
            include: ORDER_INCLUDE,
        });
        return row ? this.mapToEntity(row) : null;
    }

    // ─── Поиск по номеру заказа ──────────────────────────────────────────────

    async findByOrderNumber(orderNumber: string): Promise<Order | null> {
        const row = await this.prisma.order.findFirst({
            where: { orderNumber },
            include: ORDER_INCLUDE,
        });
        return row ? this.mapToEntity(row) : null;
    }

    // ─── Список с фильтрами и пагинацией ────────────────────────────────────

    async findAll(
        filters?: OrderFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<Order[]> {
        const where = this.buildWhere(filters);
        const orderBy = this.buildOrderBy(sortBy, sortOrder);

        const rows = await this.prisma.order.findMany({
            where,
            include: ORDER_INCLUDE,
            take: limit,
            skip,
            orderBy,
        });

        return rows.map((row) => this.mapToEntity(row));
    }

    // ─── Подсчет ─────────────────────────────────────────────────────────────

    async count(filters?: OrderFilters): Promise<number> {
        const where = this.buildWhere(filters);
        return this.prisma.order.count({ where });
    }

    // ─── Создание заказа (транзакционно: EntityRecord + Order) ───────────────

    async create(data: CreateOrderInput): Promise<Order> {
        const member = await this.prisma.member.findUnique({
            where: { id: data.memberId },
            select: { id: true, portalId: true },
        });
        if (!member) {
            throw new Error(`Member ${data.memberId} not found for order create`);
        }

        const row = await this.prisma.$transaction(async (tx) => {
            const orderDef = await tx.entityDefinition.findUniqueOrThrow({
                where: {
                    portalId_code: {
                        portalId: member.portalId,
                        code: ENTITY_DEFINITION_CODES.ORDER,
                    },
                },
            });

            const stageId =
                data.stageId ??
                (await this.resolveDefaultStageId(tx, member.portalId, orderDef.id));

            const record = await tx.entityRecord.create({
                data: {
                    portalId: member.portalId,
                    entityDefinitionId: orderDef.id,
                    stageId: stageId ?? null,
                },
            });

            return tx.order.create({
                data: {
                    portalId: member.portalId,
                    entityRecordId: record.id,
                    memberId: member.id,
                    orderNumber: data.orderNumber,
                    paymentStatus: data.paymentStatus,
                    subtotal: new Prisma.Decimal(data.subtotal),
                    discount: new Prisma.Decimal(data.discount),
                    total: new Prisma.Decimal(data.total),
                    notes: data.notes,
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            quantity: new Prisma.Decimal(item.quantity),
                            unitPrice: new Prisma.Decimal(item.unitPrice),
                            totalPrice: new Prisma.Decimal(item.totalPrice),
                            notes: item.notes,
                        })),
                    },
                },
                include: ORDER_INCLUDE,
            });
        });

        return this.mapToEntity(row);
    }

    // ─── Обновление заказа ───────────────────────────────────────────────────

    async update(id: string, data: UpdateOrderInput): Promise<Order> {
        const updateData: Prisma.OrderUpdateInput = {};

        if (data.employeeId !== undefined) {
            if (data.employeeId === null) {
                updateData.employee = { disconnect: true };
            } else {
                updateData.employee = { connect: { id: data.employeeId } };
            }
        }
        if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
        if (data.confirmedAt !== undefined) updateData.confirmedAt = data.confirmedAt;
        if (data.preparedAt !== undefined) updateData.preparedAt = data.preparedAt;
        if (data.readyAt !== undefined) updateData.readyAt = data.readyAt;
        if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
        if (data.cancelledAt !== undefined) updateData.cancelledAt = data.cancelledAt;
        if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;
        if (data.discount !== undefined) updateData.discount = new Prisma.Decimal(data.discount);
        if (data.total !== undefined) updateData.total = new Prisma.Decimal(data.total);

        const row = await this.prisma.$transaction(async (tx) => {
            // Стадия — единственный источник правды статуса, живёт на EntityRecord
            if (data.stageId !== undefined) {
                const order = await tx.order.findUniqueOrThrow({
                    where: { id },
                    select: { entityRecordId: true },
                });
                await tx.entityRecord.update({
                    where: { id: order.entityRecordId },
                    data: { stageId: data.stageId },
                });
            }
            return tx.order.update({
                where: { id },
                data: updateData,
                include: ORDER_INCLUDE,
            });
        });

        return this.mapToEntity(row);
    }

    // ─── Последний номер заказа за дату ──────────────────────────────────────

    async getLastOrderNumberForDate(date: Date): Promise<string | null> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const lastOrder = await this.prisma.order.findFirst({
            where: {
                orderedAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            orderBy: { orderNumber: "desc" },
            select: { orderNumber: true },
        });

        return lastOrder?.orderNumber ?? null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════════════════

    private async resolveDefaultStageId(
        tx: Prisma.TransactionClient,
        portalId: string,
        entityDefinitionId: string
    ): Promise<string | null> {
        const stage = await tx.stage.findFirst({
            where: {
                stageCategory: {
                    portalId,
                    entityDefinitionId,
                    isDefault: true,
                },
            },
            orderBy: { sortOrder: "asc" },
            select: { id: true },
        });
        return stage?.id ?? null;
    }

    private buildWhere(filters?: OrderFilters): Prisma.OrderWhereInput {
        if (!filters) return {};

        const where: Prisma.OrderWhereInput = {};

        if (filters.portalId) where.portalId = filters.portalId;
        if (filters.memberId) where.memberId = filters.memberId;
        if (filters.employeeId) where.employeeId = filters.employeeId;
        if (filters.status) {
            where.entityRecord = {
                stage: { name: { equals: filters.status, mode: "insensitive" } },
            };
        }
        if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;

        // Поиск по номеру заказа
        if (filters.search) {
            where.orderNumber = { contains: filters.search, mode: "insensitive" };
        }

        // Диапазон дат
        if (filters.startDate || filters.endDate) {
            where.orderedAt = {};
            if (filters.startDate) where.orderedAt.gte = filters.startDate;
            if (filters.endDate) where.orderedAt.lte = filters.endDate;
        }

        return where;
    }

    private buildOrderBy(
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Prisma.OrderOrderByWithRelationInput {
        const order = sortOrder ?? "desc";

        switch (sortBy) {
            case "orderNumber":
                return { orderNumber: order };
            case "total":
                return { total: order };
            case "orderedAt":
                return { orderedAt: order };
            default:
                return { createdAt: order };
        }
    }

    // ─── Маппинг Prisma → Domain Entity ─────────────────────────────────────

    private mapToEntity(row: OrderWithRelations): Order {
        const statusFromStage = row.entityRecord?.stage?.name
            ? String(row.entityRecord.stage.name).toLowerCase()
            : OrderStatus.PENDING;

        const order = new Order({
            id: row.id,
            memberId: row.memberId,
            employeeId: row.employeeId,
            orderNumber: row.orderNumber,
            status: coerceOrderStatus(statusFromStage),
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
    }
}
