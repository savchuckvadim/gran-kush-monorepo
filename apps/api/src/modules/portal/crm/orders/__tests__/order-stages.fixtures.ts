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

export const PORTAL = "portal-a";
export const FUNNEL = "funnel-default";

export const stage = (
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

export const PENDING = stage("Pending", StageSemantic.NEW, { sortOrder: 0 });
export const PREPARING = stage("Preparing", StageSemantic.IN_PROGRESS, { sortOrder: 2 });
export const COMPLETED = stage("Completed", StageSemantic.SUCCESS, { sortOrder: 4 });
export const CANCELLED = stage("Cancelled", StageSemantic.FAILURE, { sortOrder: 5 });
export const FUNNEL_STAGES = [PENDING, PREPARING, COMPLETED, CANCELLED];

const item = new OrderItem({
    id: "item-1",
    productId: "product-1",
    quantity: new Prisma.Decimal(2),
});

export const order = (over: Partial<Order> = {}): Order =>
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

export const repository = {
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

export const positions = { positionFor: jest.fn() };

/** Сервис стадий на моках: воронка по умолчанию, заказ в «Pending», позиция новой карточки -42. */
export const setupStagesService = async (): Promise<OrderStagesService> => {
    jest.clearAllMocks();
    repository.findByIdForPortal.mockResolvedValue(order());
    repository.findFunnelStages.mockResolvedValue(FUNNEL_STAGES);
    repository.compareAndSetStage.mockResolvedValue(true);
    repository.setStagePosition.mockResolvedValue(true);
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
    return module.get(OrderStagesService);
};
