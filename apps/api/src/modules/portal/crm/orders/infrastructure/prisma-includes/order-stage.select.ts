import { Prisma } from "@prisma/client";

import type { OrderStage } from "@modules/portal/crm/orders/domain/entity/order-stage.entity";

/** Поля стадии, из которых собирается доменная {@link OrderStage}. */
export const ORDER_STAGE_SELECT = {
    id: true,
    stageCategoryId: true,
    name: true,
    nameI18n: true,
    color: true,
    semantic: true,
    sortOrder: true,
    isTerminalSuccess: true,
    isTerminalFailure: true,
} satisfies Prisma.StageSelect;

export type OrderStageRow = Prisma.StageGetPayload<{ select: typeof ORDER_STAGE_SELECT }>;

export const toOrderStage = (row: OrderStageRow): OrderStage => ({
    id: row.id,
    stageCategoryId: row.stageCategoryId,
    name: row.name,
    nameI18n: row.nameI18n,
    color: row.color,
    semantic: row.semantic,
    sortOrder: row.sortOrder,
    isTerminalSuccess: row.isTerminalSuccess,
    isTerminalFailure: row.isTerminalFailure,
});
