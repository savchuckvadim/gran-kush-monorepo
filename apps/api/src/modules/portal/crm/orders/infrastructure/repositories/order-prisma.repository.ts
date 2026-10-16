import { Injectable } from "@nestjs/common";

import { Prisma, StageSemantic } from "@prisma/client";

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
    OrderStage,
    OrderStageSummary,
} from "@modules/portal/crm/orders/domain/entity/order-stage.entity";
import { limitWindowStart, roundGrams } from "@modules/portal/crm/orders/domain/monthly-limit";
import { legacyStatusOf } from "@modules/portal/crm/orders/domain/order-stage.rules";
import {
    CreateOrderInput,
    OrderFilters,
    OrderRepository,
    StockLine,
    UpdateOrderInput,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";
import {
    ORDER_INCLUDE,
    ORDER_STAGE_SELECT,
    toOrderStage,
} from "@modules/portal/crm/orders/infrastructure/prisma-includes";

import { enforceMonthlyLimit, sumLimitUsage } from "./order-limit.prisma";
import { reserveStock, returnStock } from "./order-stock.prisma";

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

const PAYMENT_STATUS_VALUES: ReadonlySet<string> = new Set(Object.values(PaymentStatus));

const isPaymentStatus = (raw: string): raw is PaymentStatus => PAYMENT_STATUS_VALUES.has(raw);

const coercePaymentStatus = (raw: string): PaymentStatus =>
    isPaymentStatus(raw) ? raw : PaymentStatus.PENDING;

/** Стадии воронок заказов портала: воронка принадлежит порталу и сущности `order`. */
const orderFunnelWhere = (portalId: string): Prisma.StageCategoryWhereInput => ({
    portalId,
    entityDefinition: { code: ENTITY_DEFINITION_CODES.ORDER },
});

/** Старый статус → условие на стадию: закрытие — по семантике, рабочие — по имени. */
const legacyStatusStageWhere = (status: OrderStatus): Prisma.StageWhereInput => {
    if (status === OrderStatus.CANCELLED) {
        return { OR: [{ semantic: StageSemantic.FAILURE }, { isTerminalFailure: true }] };
    }
    if (status === OrderStatus.COMPLETED) {
        return { OR: [{ semantic: StageSemantic.SUCCESS }, { isTerminalSuccess: true }] };
    }
    return { name: { equals: status, mode: "insensitive" } };
};

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

    async findByIdForPortal(id: string, portalId: string): Promise<Order | null> {
        const row = await this.prisma.order.findFirst({
            where: { id, portalId },
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

    // ─── Создание заказа (транзакционно: склад + EntityRecord + Order) ───────

    async create(data: CreateOrderInput): Promise<Order> {
        const member = await this.prisma.member.findUnique({
            where: { id: data.memberId },
            select: { id: true, portalId: true },
        });
        if (!member) {
            throw new Error(`Member ${data.memberId} not found for order create`);
        }

        const row = await this.prisma.$transaction(async (tx) => {
            if (data.monthlyLimitGrams != null) {
                await enforceMonthlyLimit(tx, {
                    memberId: member.id,
                    limitGrams: data.monthlyLimitGrams,
                    addingGrams: roundGrams(
                        data.items.reduce((sum, item) => sum + item.limitGrams, 0)
                    ),
                    since: limitWindowStart(new Date()),
                });
            }
            await reserveStock(tx, member.portalId, data.items);

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
                    createdByEmployeeId: data.employeeId ?? null,
                },
            });

            return tx.order.create({
                data: {
                    portalId: member.portalId,
                    entityRecordId: record.id,
                    memberId: member.id,
                    employeeId: data.employeeId ?? null,
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
                            isGift: item.isGift ?? false,
                            notes: item.notes,
                            limitGrams: new Prisma.Decimal(item.limitGrams),
                        })),
                    },
                },
                include: ORDER_INCLUDE,
            });
        });

        return this.mapToEntity(row);
    }

    async sumLimitUsage(memberId: string, since: Date): Promise<number> {
        return sumLimitUsage(this.prisma, memberId, since);
    }

    // ─── Перевод статуса оплаты (compare-and-set) ────────────────────────────

    /**
     * Одним `UPDATE ... WHERE payment_status = from` вместо «прочитать, проверить,
     * записать». Прежний порядок — классический TOCTOU: два параллельных
     * подтверждения оплаты оба читали `pending`, оба проходили проверку и оба писали.
     */
    async compareAndSetPaymentStatus(input: {
        orderId: string;
        portalId: string;
        from: PaymentStatus;
        to: PaymentStatus;
        employeeId?: string;
    }): Promise<boolean> {
        const result = await this.prisma.order.updateMany({
            where: {
                id: input.orderId,
                portalId: input.portalId,
                paymentStatus: input.from,
            },
            data: {
                paymentStatus: input.to,
                ...(input.employeeId ? { employeeId: input.employeeId } : {}),
            },
        });
        return result.count === 1;
    }

    // ─── Перевод стадии (compare-and-set) ────────────────────────────────────

    /**
     * Стадия живёт на EntityRecord заказа. Один `UPDATE ... WHERE stage_id = from`: две
     * параллельные отмены не пройдут обе, и товар не вернётся на склад дважды. Возврат на склад —
     * в той же транзакции: смена стадии без возврата (или наоборот) не случится.
     */
    async compareAndSetStage(input: {
        orderId: string;
        portalId: string;
        fromStageId: string | null;
        toStageId: string;
        restock?: readonly StockLine[];
    }): Promise<boolean> {
        const order = await this.prisma.order.findFirst({
            where: { id: input.orderId, portalId: input.portalId },
            select: { entityRecordId: true },
        });
        if (!order) return false;

        return this.prisma.$transaction(async (tx) => {
            const { count } = await tx.entityRecord.updateMany({
                where: { id: order.entityRecordId, stageId: input.fromStageId },
                data: { stageId: input.toStageId },
            });
            if (count !== 1) return false;
            if (input.restock?.length) await returnStock(tx, input.portalId, input.restock);
            return true;
        });
    }

    // ─── Стадии воронок заказов ──────────────────────────────────────────────

    async findStageInPortal(portalId: string, stageId: string): Promise<OrderStage | null> {
        const row = await this.prisma.stage.findFirst({
            where: { id: stageId, stageCategory: orderFunnelWhere(portalId) },
            select: ORDER_STAGE_SELECT,
        });
        return row ? toOrderStage(row) : null;
    }

    async findFunnelStages(
        portalId: string,
        stageCategoryId?: string | null
    ): Promise<OrderStage[]> {
        const rows = await this.prisma.stage.findMany({
            where: {
                stageCategory: {
                    ...orderFunnelWhere(portalId),
                    ...(stageCategoryId ? { id: stageCategoryId } : { isDefault: true }),
                },
            },
            orderBy: { sortOrder: "asc" },
            select: ORDER_STAGE_SELECT,
        });
        return rows.map(toOrderStage);
    }

    async summarizeByStage(
        filters: OrderFilters,
        stageIds: readonly string[]
    ): Promise<OrderStageSummary[]> {
        const base = this.buildWhere({ ...filters, stageId: undefined, status: undefined });
        return Promise.all(
            stageIds.map(async (stageId) => {
                const aggregate = await this.prisma.order.aggregate({
                    where: { ...base, entityRecord: { stageId } },
                    _count: { _all: true },
                    _sum: { total: true },
                });
                return {
                    stageId,
                    count: aggregate._count._all,
                    total: Number(aggregate._sum.total ?? 0),
                };
            })
        );
    }

    // ─── Обновление заказа ───────────────────────────────────────────────────

    async update(id: string, data: UpdateOrderInput): Promise<Order> {
        const updateData: Prisma.OrderUpdateInput = {};

        if (data.employeeId !== undefined) {
            updateData.employee =
                data.employeeId === null
                    ? { disconnect: true }
                    : { connect: { id: data.employeeId } };
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

    // ─── Последний номер заказа по префиксу (в пределах портала) ─────────────

    async getLastOrderNumberWithPrefix(portalId: string, prefix: string): Promise<string | null> {
        const lastOrder = await this.prisma.order.findFirst({
            where: { portalId, orderNumber: { startsWith: prefix } },
            orderBy: { orderNumber: "desc" },
            select: { orderNumber: true },
        });

        return lastOrder?.orderNumber ?? null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════════════════

    /** Новый заказ встаёт в первую рабочую стадию воронки по умолчанию. */
    private async resolveDefaultStageId(
        tx: Prisma.TransactionClient,
        portalId: string,
        entityDefinitionId: string
    ): Promise<string | null> {
        const stage = await tx.stage.findFirst({
            where: {
                semantic: { in: [StageSemantic.NEW, StageSemantic.IN_PROGRESS] },
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

        const record: Prisma.EntityRecordWhereInput = {};
        if (filters.stageId) record.stageId = filters.stageId;
        if (filters.status) record.stage = legacyStatusStageWhere(filters.status);
        if (filters.stageId || filters.status) where.entityRecord = record;

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
    }
}
