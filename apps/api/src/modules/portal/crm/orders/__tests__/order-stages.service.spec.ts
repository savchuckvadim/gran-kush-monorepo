import { StageSemantic } from "@prisma/client";

import { OrderStagesService } from "@modules/portal/crm/orders/application/services/order-stages.service";
import { OrderStatus } from "@modules/portal/crm/orders/domain/entity/order.entity";

import {
    CANCELLED,
    COMPLETED,
    FUNNEL,
    FUNNEL_STAGES,
    order,
    PENDING,
    PORTAL,
    positions,
    PREPARING,
    repository,
    setupStagesService,
    stage,
} from "./order-stages.fixtures";

describe("OrderStagesService — стадии заказа", () => {
    let service: OrderStagesService;

    beforeEach(async () => {
        service = await setupStagesService();
    });

    it("переводит compare-and-set'ом от текущей стадии и отмечает сотрудника", async () => {
        repository.findStageInPortal.mockResolvedValue(PREPARING);

        await service.moveToStage("order-1", PREPARING.id, "emp-1", PORTAL);

        expect(repository.findStageInPortal).toHaveBeenCalledWith(PORTAL, PREPARING.id);
        expect(repository.compareAndSetStage).toHaveBeenCalledWith({
            orderId: "order-1",
            portalId: PORTAL,
            fromStageId: PENDING.id,
            toStageId: PREPARING.id,
            stagePosition: -42,
            restock: undefined,
            restockedBy: "emp-1",
            events: [
                {
                    name: "order.stage_changed",
                    portalId: PORTAL,
                    actor: { kind: "employee", id: "emp-1" },
                    aggregateId: "order-1",
                    payload: {
                        orderId: "order-1",
                        orderNumber: "ORD-20261013-0001",
                        memberId: "member-1",
                        fromStageId: PENDING.id,
                        toStageId: PREPARING.id,
                        toStageSemantic: PREPARING.semantic,
                        employeeId: "emp-1",
                    },
                },
            ],
        });
        // новая стадия без соседа — наверх колонки
        expect(positions.positionFor).toHaveBeenCalledWith(
            { portalId: PORTAL, entityDefinitionId: "def-order", stageId: PREPARING.id },
            "record-of-order-1",
            null
        );
        expect(repository.update).toHaveBeenCalledWith(
            "order-1",
            expect.objectContaining({ employeeId: "emp-1", preparedAt: expect.any(Date) })
        );
    });

    it("двигает назад между рабочими стадиями", async () => {
        repository.findByIdForPortal.mockResolvedValue(order({ stage: PREPARING }));
        repository.findStageInPortal.mockResolvedValue(PENDING);

        await expect(
            service.moveToStage("order-1", PENDING.id, "emp-1", PORTAL)
        ).resolves.toBeDefined();
        expect(repository.compareAndSetStage).toHaveBeenCalled();
    });

    it("стадия не из воронок заказов клуба — 400 без записи", async () => {
        repository.findStageInPortal.mockResolvedValue(null);

        await expect(
            service.moveToStage("order-1", "foreign", "emp-1", PORTAL)
        ).rejects.toMatchObject({
            status: 400,
        });
        expect(repository.compareAndSetStage).not.toHaveBeenCalled();
    });

    it("та же стадия — не ошибка и не второй переход", async () => {
        repository.findStageInPortal.mockResolvedValue(PENDING);

        await service.moveToStage("order-1", PENDING.id, "emp-1", PORTAL);

        expect(repository.compareAndSetStage).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("закрытый заказ больше не двигается", async () => {
        repository.findByIdForPortal.mockResolvedValue(order({ stage: COMPLETED }));
        repository.findStageInPortal.mockResolvedValue(PREPARING);

        await expect(
            service.moveToStage("order-1", PREPARING.id, "emp-1", PORTAL)
        ).rejects.toMatchObject({
            status: 400,
        });
        expect(repository.compareAndSetStage).not.toHaveBeenCalled();
    });

    it("отмена возвращает товар на склад один раз и ставит cancelledAt", async () => {
        repository.findStageInPortal.mockResolvedValue(CANCELLED);

        await service.moveToStage("order-1", CANCELLED.id, "emp-1", PORTAL);

        // возврат на склад уходит в ту же транзакцию, что и смена стадии; в журнале — кто вернул
        expect(repository.compareAndSetStage).toHaveBeenCalledTimes(1);
        expect(repository.compareAndSetStage).toHaveBeenCalledWith(
            expect.objectContaining({
                toStageId: CANCELLED.id,
                restock: [{ productId: "product-1", quantity: 2 }],
                restockedBy: "emp-1",
            })
        );
        expect(repository.update).toHaveBeenCalledWith(
            "order-1",
            expect.objectContaining({ cancelledAt: expect.any(Date) })
        );
    });

    it("проигравший гонку получает 409 и склад не трогает", async () => {
        repository.findStageInPortal.mockResolvedValue(CANCELLED);
        repository.compareAndSetStage.mockResolvedValue(false);

        await expect(
            service.moveToStage("order-1", CANCELLED.id, "emp-1", PORTAL)
        ).rejects.toMatchObject({
            status: 409,
        });
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("старый PATCH status находит стадию переименованной воронки по семантике", async () => {
        repository.findFunnelStages.mockResolvedValue([
            stage("Новый", StageSemantic.NEW),
            stage("Выдан", StageSemantic.SUCCESS),
            stage("Отказ", StageSemantic.FAILURE),
        ]);

        await service.updateStatus("order-1", OrderStatus.COMPLETED, "emp-1", PORTAL);

        expect(repository.compareAndSetStage).toHaveBeenCalledWith(
            expect.objectContaining({ toStageId: "Выдан" })
        );
    });

    it("старый статус без своей стадии — 400", async () => {
        repository.findFunnelStages.mockResolvedValue([
            stage("Новый", StageSemantic.NEW),
            stage("Выдан", StageSemantic.SUCCESS),
        ]);

        await expect(
            service.updateStatus("order-1", OrderStatus.PREPARING, "emp-1", PORTAL)
        ).rejects.toMatchObject({ status: 400 });
    });

    it("отмена — ещё и order.cancelled и движение склада, автор — сотрудник", async () => {
        repository.findStageInPortal.mockResolvedValue(CANCELLED);

        await service.moveToStage("order-1", CANCELLED.id, "emp-1", PORTAL);

        const [{ events }] = repository.compareAndSetStage.mock.calls[0] as [
            { events: { name: string; payload: Record<string, unknown> }[] },
        ];
        expect(events.map((event) => event.name)).toEqual([
            "order.stage_changed",
            "order.cancelled",
            "product.stock_changed",
        ]);
        expect(events[1]?.payload).toMatchObject({ cancelledBy: "staff" });
        expect(events[2]?.payload).toEqual({
            productId: "product-1",
            reason: "order_cancelled",
            orderId: "order-1",
        });
    });

    it("отмена участником — автор события участник", async () => {
        await service.cancelOrderByMember("order-1", "member-1", PORTAL, "передумал");

        expect(repository.compareAndSetStage).toHaveBeenCalledWith(
            expect.objectContaining({
                events: expect.arrayContaining([
                    expect.objectContaining({
                        name: "order.cancelled",
                        actor: { kind: "member", id: "member-1" },
                        payload: expect.objectContaining({ cancelledBy: "member" }),
                    }),
                ]),
            })
        );
    });

    it("участник отменяет только новый заказ — в первую стадию отказа его воронки", async () => {
        await service.cancelOrderByMember("order-1", "member-1", PORTAL, "передумал");

        expect(repository.findFunnelStages).toHaveBeenCalledWith(PORTAL, FUNNEL);
        // отмена из кабинета: товар вернул участник, сотрудника в журнале нет
        expect(repository.compareAndSetStage).toHaveBeenCalledWith(
            expect.objectContaining({
                toStageId: CANCELLED.id,
                restock: [{ productId: "product-1", quantity: 2 }],
                restockedBy: null,
            })
        );
    });

    it("отмена участником дописывается к заметкам сотрудников, а не стирает их", async () => {
        repository.findByIdForPortal.mockResolvedValue(order({ adminNotes: "позвонить до 18:00" }));

        await service.cancelOrderByMember("order-1", "member-1", PORTAL, "передумал");

        expect(repository.update).toHaveBeenCalledWith(
            "order-1",
            expect.objectContaining({
                adminNotes: "позвонить до 18:00\nОтменено участником: передумал",
            })
        );
    });

    it("чужой заказ участник не отменяет — 404, как будто его нет", async () => {
        await expect(
            service.cancelOrderByMember("order-1", "member-2", PORTAL)
        ).rejects.toMatchObject({ status: 404 });
        expect(repository.compareAndSetStage).not.toHaveBeenCalled();
    });

    it("участник не отменяет заказ, который клуб уже взял в работу", async () => {
        repository.findByIdForPortal.mockResolvedValue(order({ stage: PREPARING }));

        await expect(
            service.cancelOrderByMember("order-1", "member-1", PORTAL)
        ).rejects.toMatchObject({ status: 400 });
        expect(repository.compareAndSetStage).not.toHaveBeenCalled();
    });

    it("сводка по воронке: чужая или пустая воронка — 404", async () => {
        repository.findFunnelStages.mockResolvedValue([]);

        await expect(service.summarizeFunnel(PORTAL, "foreign", {})).rejects.toMatchObject({
            status: 404,
        });
        expect(repository.summarizeByStage).not.toHaveBeenCalled();
    });

    it("сводка по воронке считает все её стадии в пределах портала", async () => {
        repository.summarizeByStage.mockResolvedValue([]);

        await service.summarizeFunnel(PORTAL, FUNNEL, { search: "ORD" });

        expect(repository.summarizeByStage).toHaveBeenCalledWith(
            { search: "ORD", portalId: PORTAL },
            FUNNEL_STAGES.map((s) => s.id)
        );
    });
});
