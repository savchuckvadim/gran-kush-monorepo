import { StageSemantic } from "@prisma/client";

import { OrderStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";
import { OrderStage } from "@modules/portal/crm/orders/domain/entity/order-stage.entity";
import {
    isClosedStage,
    legacyStatusOf,
    lifecycleFieldFor,
    stageForLegacyStatus,
} from "@modules/portal/crm/orders/domain/order-stage.rules";

const stage = (
    name: string,
    semantic: StageSemantic,
    over: Partial<OrderStage> = {}
): OrderStage => ({
    id: name,
    stageCategoryId: "funnel",
    name,
    nameI18n: null,
    color: null,
    semantic,
    sortOrder: 0,
    isTerminalSuccess: false,
    isTerminalFailure: false,
    ...over,
});

describe("order-stage.rules", () => {
    it.each([
        ["Pending", StageSemantic.NEW, OrderStatus.PENDING],
        ["Preparing", StageSemantic.IN_PROGRESS, OrderStatus.PREPARING],
        ["Ready", StageSemantic.IN_PROGRESS, OrderStatus.READY],
        ["В зале", StageSemantic.NEW, OrderStatus.PENDING],
        ["Собираем", StageSemantic.IN_PROGRESS, OrderStatus.CONFIRMED],
        ["Выдан", StageSemantic.SUCCESS, OrderStatus.COMPLETED],
        ["Отказ", StageSemantic.FAILURE, OrderStatus.CANCELLED],
    ])("стадия «%s» (%s) → статус %s", (name, semantic, expected) => {
        expect(legacyStatusOf(stage(name, semantic))).toBe(expected);
    });

    it("переименование в «pending» не делает закрытую стадию рабочей", () => {
        expect(legacyStatusOf(stage("pending", StageSemantic.FAILURE))).toBe(OrderStatus.CANCELLED);
    });

    it("флаги терминальности закрывают стадию даже без семантики", () => {
        expect(
            isClosedStage(stage("x", StageSemantic.IN_PROGRESS, { isTerminalSuccess: true }))
        ).toBe(true);
    });

    it("без стадии статус — pending", () => {
        expect(legacyStatusOf(null)).toBe(OrderStatus.PENDING);
    });

    it("рабочий статус ищется по имени только среди рабочих стадий", () => {
        const stages = [
            stage("Ready", StageSemantic.SUCCESS),
            stage("ready", StageSemantic.IN_PROGRESS, { id: "working-ready" }),
        ];
        expect(stageForLegacyStatus(stages, OrderStatus.READY)?.id).toBe("working-ready");
    });

    it("pending без стадии с таким именем — первая стадия NEW", () => {
        const stages = [
            stage("Собираем", StageSemantic.IN_PROGRESS),
            stage("Новый", StageSemantic.NEW),
        ];
        expect(stageForLegacyStatus(stages, OrderStatus.PENDING)?.name).toBe("Новый");
    });

    it("вход в стадию отмечает своё поле жизненного цикла", () => {
        expect(lifecycleFieldFor(stage("Preparing", StageSemantic.IN_PROGRESS))).toBe("preparedAt");
        expect(lifecycleFieldFor(stage("Отказ", StageSemantic.FAILURE))).toBe("cancelledAt");
        expect(lifecycleFieldFor(stage("Pending", StageSemantic.NEW))).toBeUndefined();
    });
});
