import { Prisma, StageSemantic } from "@prisma/client";

import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import { OrderStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";
import type { OrderFilters } from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

/** Стадии воронок заказов портала: воронка принадлежит порталу и сущности `order`. */
export const orderFunnelWhere = (portalId: string): Prisma.StageCategoryWhereInput => ({
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

export const buildOrderWhere = (filters?: OrderFilters): Prisma.OrderWhereInput => {
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
};

export const buildOrderOrderBy = (
    sortBy?: string,
    sortOrder?: "asc" | "desc"
): Prisma.OrderOrderByWithRelationInput[] => {
    const order = sortOrder ?? "desc";

    switch (sortBy) {
        // колонка канбана: место карточки, равные — новые выше
        case "stagePosition":
            return [{ entityRecord: { stagePosition: order } }, { createdAt: "desc" }];
        case "orderNumber":
            return [{ orderNumber: order }];
        case "total":
            return [{ total: order }];
        case "orderedAt":
            return [{ orderedAt: order }];
        default:
            return [{ createdAt: order }];
    }
};

// ─── Маппинг Prisma → Domain Entity ─────────────────────────────────────
