import { StageSemantic } from "@prisma/client";

import { OrderStatus } from "./entity/order.entity";
import type { OrderStage } from "./entity/order-stage.entity";

type StageKind = Pick<OrderStage, "semantic" | "isTerminalSuccess" | "isTerminalFailure">;

export const isFailureStage = (stage: StageKind): boolean =>
    stage.semantic === StageSemantic.FAILURE || stage.isTerminalFailure;

export const isSuccessStage = (stage: StageKind): boolean =>
    stage.semantic === StageSemantic.SUCCESS || stage.isTerminalSuccess;

/** Закрытый заказ больше не двигается: он выдан или отменён, и склад по нему уже сведён. */
export const isClosedStage = (stage: StageKind): boolean =>
    isFailureStage(stage) || isSuccessStage(stage);

/** Участник отменяет заказ сам, пока клуб не взял его в работу: заказ ещё в стадии «новый». */
export const memberMayCancel = (stage: Pick<OrderStage, "semantic"> | null | undefined): boolean =>
    !stage || stage.semantic === StageSemantic.NEW;

/** Названия стадий системной воронки, из которых раньше брался статус. */
const LEGACY_STATUS_BY_NAME: Readonly<Record<string, OrderStatus>> = {
    pending: OrderStatus.PENDING,
    confirmed: OrderStatus.CONFIRMED,
    preparing: OrderStatus.PREPARING,
    ready: OrderStatus.READY,
};

const normalizedName = (stage: Pick<OrderStage, "name">): string => stage.name.trim().toLowerCase();

/**
 * Статус для старых клиентов (ЛК, фильтр `status`). Клуб может переименовать стадии, поэтому
 * сначала семантика: закрытие — по ней, рабочие стадии — по старому имени, иначе по семантике.
 */
export function legacyStatusOf(stage: OrderStage | null | undefined): OrderStatus {
    if (!stage) return OrderStatus.PENDING;
    if (isFailureStage(stage)) return OrderStatus.CANCELLED;
    if (isSuccessStage(stage)) return OrderStatus.COMPLETED;
    return (
        LEGACY_STATUS_BY_NAME[normalizedName(stage)] ??
        (stage.semantic === StageSemantic.NEW ? OrderStatus.PENDING : OrderStatus.CONFIRMED)
    );
}

/** Стадия воронки для старого статуса — для `PATCH /crm/orders/:id/status`. */
export function stageForLegacyStatus(
    stages: readonly OrderStage[],
    status: OrderStatus
): OrderStage | undefined {
    if (status === OrderStatus.CANCELLED) return stages.find(isFailureStage);
    if (status === OrderStatus.COMPLETED) return stages.find(isSuccessStage);

    const working = stages.filter((stage) => !isClosedStage(stage));
    const byName = working.find((stage) => LEGACY_STATUS_BY_NAME[normalizedName(stage)] === status);
    if (byName) return byName;
    return status === OrderStatus.PENDING
        ? working.find((stage) => stage.semantic === StageSemantic.NEW)
        : undefined;
}

/** Поле, которым заказ отмечает вход в стадию (первый раз). */
export type OrderLifecycleField =
    | "confirmedAt"
    | "preparedAt"
    | "readyAt"
    | "completedAt"
    | "cancelledAt";

const LIFECYCLE_FIELD: Readonly<Partial<Record<OrderStatus, OrderLifecycleField>>> = {
    [OrderStatus.CONFIRMED]: "confirmedAt",
    [OrderStatus.PREPARING]: "preparedAt",
    [OrderStatus.READY]: "readyAt",
    [OrderStatus.COMPLETED]: "completedAt",
    [OrderStatus.CANCELLED]: "cancelledAt",
};

export const lifecycleFieldFor = (stage: OrderStage): OrderLifecycleField | undefined =>
    LIFECYCLE_FIELD[legacyStatusOf(stage)];
