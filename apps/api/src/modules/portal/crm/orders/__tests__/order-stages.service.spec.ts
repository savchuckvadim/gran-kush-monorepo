import { Test, TestingModule } from "@nestjs/testing";

import { Prisma, StageSemantic } from "@prisma/client";

import { OrderStagesService } from "@modules/portal/crm/orders/application/services/order-stages.service";
import { OrdersService } from "@modules/portal/crm/orders/application/services/orders.service";
import {
    Order,
    OrderItem,
    OrderStatus,
    PaymentStatus,
} from "@modules/portal/crm/orders/domain/entity/order.entity";
import { OrderStage } from "@modules/portal/crm/orders/domain/entity/order-stage.entity";
import { OrderRepository } from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";
import { OrderStageRepository } from "@modules/portal/crm/orders/domain/repositories/order-stage-repository.interface";
import { StagePositionService } from "@modules/portal/crm/records/application/services/stage-position.service";

const PORTAL = "portal-a";
const FUNNEL = "funnel-default";

const stage = (
    id: string,
    semantic: StageSemantic,
    over: Partial<OrderStage> = {}
): OrderStage => ({
    id,
    stageCategoryId: FUNNEL,
    name: id,
    nameI18n: null,
    color: null,
    semantic,
    sortOrder: 0,
    isTerminalSuccess: semantic === StageSemantic.SUCCESS,
    isTerminalFailure: semantic === StageSemantic.FAILURE,
    ...over,
});

const PENDING = stage("Pending", StageSemantic.NEW, { sortOrder: 0 });
const PREPARING = stage("Preparing", StageSemantic.IN_PROGRESS, { sortOrder: 2 });
const COMPLETED = stage("Completed", StageSemantic.SUCCESS, { sortOrder: 4 });
const CANCELLED = stage("Cancelled", StageSemantic.FAILURE, { sortOrder: 5 });
const FUNNEL_STAGES = [PENDING, PREPARING, COMPLETED, CANCELLED];

const item = new OrderItem({
    id: "item-1",
    productId: "product-1",
    quantity: new Prisma.Decimal(2),
});

const order = (over: Partial<Order> = {}): Order =>
    new Order({
        id: "order-1",
        memberId: "member-1",
        orderNumber: "ORD-20261013-0001",
        stage: PENDING,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: [item],
        ...over,
    });

const repository = {
    findById: jest.fn(),
    findByIdForPortal: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    compareAndSetPaymentStatus: jest.fn(),
    compareAndSetStage: jest.fn(),
    findStageInPortal: jest.fn(),
    findFunnelStages: jest.fn(),
    summarizeByStage: jest.fn(),
    findCardRecord: jest.fn(),
    setStagePosition: jest.fn(),
    getLastOrderNumberWithPrefix: jest.fn(),
};

const positions = { positionFor: jest.fn() };

describe("OrderStagesService — стадии заказа", () => {
    let service: OrderStagesService;

    beforeEach(async () => {
        jest.clearAllMocks();
        repository.findByIdForPortal.mockResolvedValue(order());
        repository.findFunnelStages.mockResolvedValue(FUNNEL_STAGES);
        repository.compareAndSetStage.mockResolvedValue(true);
        repository.findCardRecord.mockImplementation((orderId: string) =>
            Promise.resolve({
                entityRecordId: `record-of-${orderId}`,
                entityDefinitionId: "def-order",
            })
        );
        positions.positionFor.mockResolvedValue(-42);
        repository.update.mockImplementation((_id: string, data: Partial<Order>) =>
            Promise.resolve(order(data))
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderStagesService,
                OrdersService,
                { provide: OrderRepository, useValue: repository },
                { provide: OrderStageRepository, useValue: repository },
                { provide: StagePositionService, useValue: positions },
            ],
        }).compile();
        service = module.get(OrderStagesService);
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

    it("ставит карточку под соседа в новой колонке", async () => {
        repository.findStageInPortal.mockResolvedValue(PREPARING);

        await service.moveToStage("order-1", PREPARING.id, "emp-1", PORTAL, "order-2");

        expect(positions.positionFor).toHaveBeenCalledWith(
            { portalId: PORTAL, entityDefinitionId: "def-order", stageId: PREPARING.id },
            "record-of-order-1",
            "record-of-order-2"
        );
    });

    it("в той же стадии с соседом только переставляет карточку", async () => {
        repository.findStageInPortal.mockResolvedValue(PENDING);

        await service.moveToStage("order-1", PENDING.id, "emp-1", PORTAL, null);

        expect(repository.setStagePosition).toHaveBeenCalledWith("record-of-order-1", -42);
        expect(repository.compareAndSetStage).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
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

        // возврат на склад уходит в ту же транзакцию, что и смена стадии
        expect(repository.compareAndSetStage).toHaveBeenCalledTimes(1);
        expect(repository.compareAndSetStage).toHaveBeenCalledWith(
            expect.objectContaining({
                toStageId: CANCELLED.id,
                restock: [{ productId: "product-1", quantity: 2 }],
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

    it("участник отменяет только новый заказ — в первую стадию отказа его воронки", async () => {
        await service.cancelOrderByMember("order-1", "member-1", PORTAL, "передумал");

        expect(repository.findFunnelStages).toHaveBeenCalledWith(PORTAL, FUNNEL);
        expect(repository.compareAndSetStage).toHaveBeenCalledWith(
            expect.objectContaining({
                toStageId: CANCELLED.id,
                restock: [{ productId: "product-1", quantity: 2 }],
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
