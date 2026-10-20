import { Injectable } from "@nestjs/common";

import { Prisma, StageSemantic } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type EventsOf, type NewDomainEvent } from "@modules/events";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import { Order, PaymentStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";
import { limitWindowStart, roundGrams } from "@modules/portal/crm/orders/domain/monthly-limit";
import {
    CreateOrderInput,
    OrderFilters,
    OrderRepository,
    UpdateOrderInput,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";
import { ORDER_INCLUDE } from "@modules/portal/crm/orders/infrastructure/prisma-includes";

import { enforceMonthlyLimit, sumLimitUsage } from "./order-limit.prisma";
import { buildOrderOrderBy, buildOrderWhere } from "./order-query.prisma";
import { toOrderEntity } from "./order-row.mapper";
import { reserveStock } from "./order-stock.prisma";

@Injectable()
export class OrderPrismaRepository extends OrderRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {
        super();
    }

    // ─── Поиск по ID ─────────────────────────────────────────────────────────

    async findById(id: string): Promise<Order | null> {
        const row = await this.prisma.order.findUnique({
            where: { id },
            include: ORDER_INCLUDE,
        });
        return row ? toOrderEntity(row) : null;
    }

    async findByIdForPortal(id: string, portalId: string): Promise<Order | null> {
        const row = await this.prisma.order.findFirst({
            where: { id, portalId },
            include: ORDER_INCLUDE,
        });
        return row ? toOrderEntity(row) : null;
    }

    // ─── Список с фильтрами и пагинацией ────────────────────────────────────

    async findAll(
        filters?: OrderFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<Order[]> {
        const where = buildOrderWhere(filters);
        const orderBy = buildOrderOrderBy(sortBy, sortOrder);

        const rows = await this.prisma.order.findMany({
            where,
            include: ORDER_INCLUDE,
            take: limit,
            skip,
            orderBy,
        });

        return rows.map((row) => toOrderEntity(row));
    }

    // ─── Подсчет ─────────────────────────────────────────────────────────────

    async count(filters?: OrderFilters): Promise<number> {
        const where = buildOrderWhere(filters);
        return this.prisma.order.count({ where });
    }

    // ─── Создание заказа (транзакционно: склад + EntityRecord + Order) ───────

    async create(data: CreateOrderInput, events?: EventsOf<Order>): Promise<Order> {
        const member = await this.prisma.member.findUnique({
            where: { id: data.memberId },
            select: { id: true, portalId: true },
        });
        if (!member) {
            throw new Error(`Member ${data.memberId} not found for order create`);
        }

        return this.prisma.$transaction(async (tx) => {
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

            const row = await tx.order.create({
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
            const order = toOrderEntity(row);
            if (events) await this.events.publishMany(tx, events(order));
            return order;
        });
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
        events?: readonly NewDomainEvent[];
    }): Promise<boolean> {
        return this.prisma.$transaction(async (tx) => {
            const result = await tx.order.updateMany({
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
            if (result.count !== 1) return false;
            if (input.events?.length) await this.events.publishMany(tx, input.events);
            return true;
        });
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
        return toOrderEntity(row);
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
}
