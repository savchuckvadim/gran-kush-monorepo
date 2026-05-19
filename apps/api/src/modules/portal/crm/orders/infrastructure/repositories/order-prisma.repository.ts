import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
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
        const row = await this.prisma.order.findUnique({
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

    // ─── Создание заказа (транзакционно) ─────────────────────────────────────

    async create(data: CreateOrderInput): Promise<Order> {
        const member = await this.prisma.member.findUnique({
            where: { id: data.memberId },
            select: { entityRecordId: true },
        });
        if (!member) {
            throw new Error(`Member ${data.memberId} not found for order create`);
        }
        const row = await this.prisma.order.create({
            data: {
                customerEntityRecordId: member.entityRecordId,
                orderNumber: data.orderNumber,
                status: data.status,
                stageId: data.stageId ?? undefined,
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
        if (data.status !== undefined) updateData.status = data.status;
        if (data.stageId !== undefined) {
            if (data.stageId === null) {
                updateData.stage = { disconnect: true };
            } else {
                updateData.stage = { connect: { id: data.stageId } };
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

        const row = await this.prisma.order.update({
            where: { id },
            data: updateData,
            include: ORDER_INCLUDE,
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

    private buildWhere(filters?: OrderFilters): Prisma.OrderWhereInput {
        if (!filters) return {};

        const where: Prisma.OrderWhereInput = {};

        if (filters.memberId) {
            where.customerEntity = { member: { id: filters.memberId } };
        }
        if (filters.employeeId) where.employeeId = filters.employeeId;
        if (filters.status) where.status = filters.status;
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
            case "status":
                return { status: order };
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
        const statusFromStage =
            row.stage?.name != null ? String(row.stage.name).toLowerCase() : row.status;

        const memberIdForDomain = row.customerEntity?.member?.id ?? row.customerEntityRecordId;

        const order = new Order({
            id: row.id,
            memberId: memberIdForDomain,
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

        if (row.customerEntity?.member) {
            const m = row.customerEntity.member;
            const fieldMap = buildMemberFieldMap(
                (row.customerEntity.fieldValues ?? []).map(
                    (fv): FieldRow => ({
                        valueJson: fv.valueJson,
                        fieldDefinition: fv.fieldDefinition,
                    })
                )
            );
            const { firstName, lastName } = getMemberDisplayNameParts(fieldMap);
            order.member = {
                id: m.id,
                name: firstName,
                surname: lastName,
                membershipNumber: m.membershipNumber,
            };
        }

        // Employee
        if (row.employee) {
            order.employee = {
                id: row.employee.id,
                name: row.employee.name,
                surname: row.employee.surname,
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
