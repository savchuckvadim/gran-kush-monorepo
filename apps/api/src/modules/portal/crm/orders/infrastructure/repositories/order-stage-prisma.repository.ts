import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import type {
    OrderStage,
    OrderStageSummary,
} from "@modules/portal/crm/orders/domain/entity/order-stage.entity";
import type {
    OrderFilters,
    StockLine,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";
import { OrderStageRepository } from "@modules/portal/crm/orders/domain/repositories/order-stage-repository.interface";
import {
    ORDER_STAGE_SELECT,
    toOrderStage,
} from "@modules/portal/crm/orders/infrastructure/prisma-includes";

import { buildOrderWhere, orderFunnelWhere } from "./order-query.prisma";
import { returnStock } from "./order-stock.prisma";

@Injectable()
export class OrderStagePrismaRepository extends OrderStageRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
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
        stagePosition?: number;
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
                data: { stageId: input.toStageId, stagePosition: input.stagePosition },
            });
            if (count !== 1) return false;
            if (input.restock?.length) await returnStock(tx, input.portalId, input.restock);
            return true;
        });
    }

    async findCardRecord(
        orderId: string,
        portalId: string
    ): Promise<{ entityRecordId: string; entityDefinitionId: string } | null> {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, portalId },
            select: {
                entityRecordId: true,
                entityRecord: { select: { entityDefinitionId: true } },
            },
        });
        return order
            ? {
                  entityRecordId: order.entityRecordId,
                  entityDefinitionId: order.entityRecord.entityDefinitionId,
              }
            : null;
    }

    async setStagePosition(entityRecordId: string, stagePosition: number): Promise<void> {
        await this.prisma.entityRecord.update({
            where: { id: entityRecordId },
            data: { stagePosition },
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
        const base = buildOrderWhere({ ...filters, stageId: undefined, status: undefined });
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
}
