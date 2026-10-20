import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { Prisma } from "@prisma/client";

import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { MemberLimitService } from "@modules/portal/crm/club-policy/application/services/member-limit.service";
import { TaxPolicyService } from "@modules/portal/crm/finance/application/services/tax-policy.service";
import { OrderPlacementService } from "@modules/portal/crm/orders/application/services/order-placement.service";
import { Order } from "@modules/portal/crm/orders/domain/entity/order.entity";
import { InsufficientStockError } from "@modules/portal/crm/orders/domain/errors/insufficient-stock.error";
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
    compareAndSetPaymentStatus: jest.fn(),
    compareAndSetStage: jest.fn(),
    findStageInPortal: jest.fn(),
    findFunnelStages: jest.fn(),
    summarizeByStage: jest.fn(),
    getLastOrderNumberWithPrefix: jest.fn(),
};

const mockProductsService = {
    findById: jest.fn(),
};

/** Лимит клуба выключен: правила лимита проверяет отдельный набор тестов */
const mockMemberLimits = {
    settingsOf: jest
        .fn()
        .mockResolvedValue({ enabled: false, personalGrams: null, limitGrams: null }),
};

const orderNumberConflict = (): Prisma.PrismaClientKnownRequestError =>
    new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: "orders_portal_id_order_number_key" },
    });

describe("OrderPlacementService — номер заказа", () => {
    let service: OrderPlacementService;

    const input = { memberId: MEMBER_ID, items: [{ productId: PRODUCT_ID, quantity: 2 }] };

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

        mockOrderRepository.create.mockImplementation(
            (input: CreateOrderInput) =>
                ({ id: "order-1", orderNumber: input.orderNumber }) as Order
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderPlacementService,
                { provide: OrderRepository, useValue: mockOrderRepository },
                { provide: ProductsService, useValue: mockProductsService },
                { provide: MemberLimitService, useValue: mockMemberLimits },
                // финансы клуба выключены: заказ без разбивки налога
                {
                    provide: TaxPolicyService,
                    useValue: { rulesFor: jest.fn().mockResolvedValue(null) },
                },
            ],
        }).compile();

        service = module.get(OrderPlacementService);
    });

    it("ищет последний номер в пределах своего портала", async () => {
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);

        await service.place(PORTAL_A, input);

        expect(mockOrderRepository.getLastOrderNumberWithPrefix).toHaveBeenCalledWith(
            PORTAL_A,
            expect.stringMatching(/^ORD-\d{8}-$/)
        );
    });

    it("начинает нумерацию с 0001, когда в портале ещё нет заказов за сегодня", async () => {
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);

        const order = await service.place(PORTAL_A, input);

        expect(order.orderNumber).toMatch(/^ORD-\d{8}-0001$/);
    });

    it("продолжает нумерацию от последнего номера портала", async () => {
        const prefix = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(`${prefix}0042`);

        const order = await service.place(PORTAL_A, input);

        expect(order.orderNumber).toBe(`${prefix}0043`);
    });

    it("подбирает следующий номер, если параллельный заказ занял текущий", async () => {
        const prefix = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;
        mockOrderRepository.getLastOrderNumberWithPrefix
            .mockResolvedValueOnce(`${prefix}0007`)
            .mockResolvedValueOnce(`${prefix}0008`);

        mockOrderRepository.create.mockRejectedValueOnce(orderNumberConflict());

        const order = await service.place(PORTAL_A, input);

        expect(mockOrderRepository.create).toHaveBeenCalledTimes(2);
        expect(order.orderNumber).toBe(`${prefix}0009`);
    });

    it("товар кончился, пока оформляли заказ, — 400 с названием товара", async () => {
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);
        mockOrderRepository.create.mockRejectedValue(new InsufficientStockError(PRODUCT_ID));

        const attempt = service.place(PORTAL_A, input);

        await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
        await expect(attempt).rejects.toThrow('Недостаточно товара "Товар"');
        expect(mockOrderRepository.create).toHaveBeenCalledTimes(1);
    });

    it("пробрасывает ошибки, не связанные с номером заказа", async () => {
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);
        mockOrderRepository.create.mockRejectedValue(new Error("db is down"));

        await expect(service.place(PORTAL_A, input)).rejects.toThrow("db is down");
        expect(mockOrderRepository.create).toHaveBeenCalledTimes(1);
    });

    it("сдаётся после исчерпания попыток и отдаёт исходную ошибку", async () => {
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);
        mockOrderRepository.create.mockRejectedValue(orderNumberConflict());

        await expect(service.place(PORTAL_A, input)).rejects.toMatchObject({
            code: "P2002",
        });
        expect(mockOrderRepository.create).toHaveBeenCalledTimes(5);
    });
});
