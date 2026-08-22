import { Test, TestingModule } from "@nestjs/testing";

import { Prisma } from "@prisma/client";

import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { OrderStagesService } from "@modules/portal/crm/entity-fields/application/services/order-stages.service";
import { CreateOrderDto } from "@modules/portal/crm/orders/api/dto/order.dto";
import { OrdersService } from "@modules/portal/crm/orders/application/services/orders.service";
import { Order } from "@modules/portal/crm/orders/domain/entity/order.entity";
import {
    CreateOrderInput,
    OrderRepository,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

const PORTAL_A = "portal-a";
const MEMBER_ID = "member-1";
const PRODUCT_ID = "product-1";

const mockOrderRepository = {
    findById: jest.fn(),
    findByIdForPortal: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getLastOrderNumberWithPrefix: jest.fn(),
};

const mockProductsService = {
    findById: jest.fn(),
    adjustQuantity: jest.fn(),
};

const mockOrderStages = {
    resolvePortalIdForMember: jest.fn(),
    getStageIdForOrderStatus: jest.fn(),
};

const orderNumberConflict = (): Prisma.PrismaClientKnownRequestError =>
    new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: "orders_portal_id_order_number_key" },
    });

describe("OrdersService — номер заказа", () => {
    let service: OrdersService;

    const dto: CreateOrderDto = {
        items: [{ productId: PRODUCT_ID, quantity: 2 }],
    } as CreateOrderDto;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProductsService.findById.mockResolvedValue({
            id: PRODUCT_ID,
            name: "Товар",
            isActive: true,
            isAvailable: true,
            currentQuantity: new Prisma.Decimal(10),
            price: new Prisma.Decimal(5),
        });
        mockProductsService.adjustQuantity.mockResolvedValue(undefined);

        mockOrderStages.resolvePortalIdForMember.mockResolvedValue(PORTAL_A);
        mockOrderStages.getStageIdForOrderStatus.mockResolvedValue("stage-1");

        mockOrderRepository.create.mockImplementation(
            (input: CreateOrderInput) =>
                ({ id: "order-1", orderNumber: input.orderNumber }) as Order
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                { provide: OrderRepository, useValue: mockOrderRepository },
                { provide: ProductsService, useValue: mockProductsService },
                { provide: OrderStagesService, useValue: mockOrderStages },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
    });

    it("ищет последний номер в пределах своего портала", async () => {
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);

        await service.createOrder(MEMBER_ID, dto, PORTAL_A);

        expect(mockOrderRepository.getLastOrderNumberWithPrefix).toHaveBeenCalledWith(
            PORTAL_A,
            expect.stringMatching(/^ORD-\d{8}-$/)
        );
    });

    it("начинает нумерацию с 0001, когда в портале ещё нет заказов за сегодня", async () => {
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);

        const order = await service.createOrder(MEMBER_ID, dto, PORTAL_A);

        expect(order.orderNumber).toMatch(/^ORD-\d{8}-0001$/);
    });

    it("продолжает нумерацию от последнего номера портала", async () => {
        const prefix = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(`${prefix}0042`);

        const order = await service.createOrder(MEMBER_ID, dto, PORTAL_A);

        expect(order.orderNumber).toBe(`${prefix}0043`);
    });

    it("подбирает следующий номер, если параллельный заказ занял текущий", async () => {
        const prefix = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;
        mockOrderRepository.getLastOrderNumberWithPrefix
            .mockResolvedValueOnce(`${prefix}0007`)
            .mockResolvedValueOnce(`${prefix}0008`);

        mockOrderRepository.create.mockRejectedValueOnce(orderNumberConflict());

        const order = await service.createOrder(MEMBER_ID, dto, PORTAL_A);

        expect(mockOrderRepository.create).toHaveBeenCalledTimes(2);
        expect(order.orderNumber).toBe(`${prefix}0009`);
    });

    it("не списывает товар со склада дважды при конфликте номера", async () => {
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);
        mockOrderRepository.create.mockRejectedValueOnce(orderNumberConflict());

        await service.createOrder(MEMBER_ID, dto, PORTAL_A);

        expect(mockProductsService.adjustQuantity).toHaveBeenCalledTimes(1);
    });

    it("пробрасывает ошибки, не связанные с номером заказа", async () => {
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);
        mockOrderRepository.create.mockRejectedValue(new Error("db is down"));

        await expect(service.createOrder(MEMBER_ID, dto, PORTAL_A)).rejects.toThrow("db is down");
        expect(mockOrderRepository.create).toHaveBeenCalledTimes(1);
    });

    it("сдаётся после исчерпания попыток и отдаёт исходную ошибку", async () => {
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);
        mockOrderRepository.create.mockRejectedValue(orderNumberConflict());

        await expect(service.createOrder(MEMBER_ID, dto, PORTAL_A)).rejects.toMatchObject({
            code: "P2002",
        });
        expect(mockOrderRepository.create).toHaveBeenCalledTimes(5);
    });
});
