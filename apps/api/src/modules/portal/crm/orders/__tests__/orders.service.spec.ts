import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { Prisma, StageSemantic } from "@prisma/client";

import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import { CreateOrderDto, CrmCreateOrderDto } from "@modules/portal/crm/orders/api/dto/order.dto";
import { OrdersService } from "@modules/portal/crm/orders/application/services/orders.service";
import {
    Order,
    OrderStatus,
    PaymentStatus,
} from "@modules/portal/crm/orders/domain/entity/order.entity";
import { OrderStage } from "@modules/portal/crm/orders/domain/entity/order-stage.entity";
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

const mockMembersService = {
    findByIdForPortal: jest.fn(),
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

        mockOrderRepository.create.mockImplementation(
            (input: CreateOrderInput) =>
                ({ id: "order-1", orderNumber: input.orderNumber }) as Order
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                { provide: OrderRepository, useValue: mockOrderRepository },
                { provide: ProductsService, useValue: mockProductsService },
                { provide: MembersService, useValue: mockMembersService },
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

    it("товар кончился, пока оформляли заказ, — 400 с названием товара", async () => {
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);
        mockOrderRepository.create.mockRejectedValue(new InsufficientStockError(PRODUCT_ID));

        const attempt = service.createOrder(MEMBER_ID, dto, PORTAL_A);

        await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
        await expect(attempt).rejects.toThrow('Недостаточно товара "Товар"');
        expect(mockOrderRepository.create).toHaveBeenCalledTimes(1);
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

describe("OrdersService — переход статуса оплаты", () => {
    let service: OrdersService;

    const order = (over: Partial<Order> = {}) =>
        ({
            id: "order-1",
            orderNumber: "ORD-20260828-0001",
            status: OrderStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PENDING,
            ...over,
        }) as Order;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockOrderRepository.findByIdForPortal.mockResolvedValue(order());
        mockOrderRepository.compareAndSetPaymentStatus.mockResolvedValue(true);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                { provide: OrderRepository, useValue: mockOrderRepository },
                { provide: ProductsService, useValue: mockProductsService },
                { provide: MembersService, useValue: mockMembersService },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
    });

    it("переводит оплату compare-and-set'ом от текущего статуса, а не слепым update", async () => {
        await service.updatePaymentStatus("order-1", PaymentStatus.PAID, "emp-1", PORTAL_A);

        expect(mockOrderRepository.compareAndSetPaymentStatus).toHaveBeenCalledWith({
            orderId: "order-1",
            portalId: PORTAL_A,
            from: PaymentStatus.PENDING,
            to: PaymentStatus.PAID,
            employeeId: "emp-1",
        });
        expect(mockOrderRepository.update).not.toHaveBeenCalled();
    });

    it("проигравший гонку запрос получает 409, а не тихий успех", async () => {
        mockOrderRepository.compareAndSetPaymentStatus.mockResolvedValue(false);

        await expect(
            service.updatePaymentStatus("order-1", PaymentStatus.PAID, "emp-1", PORTAL_A)
        ).rejects.toMatchObject({ status: 409 });
    });

    it("не откатывает оплаченный заказ обратно в pending", async () => {
        mockOrderRepository.findByIdForPortal.mockResolvedValue(
            order({ paymentStatus: PaymentStatus.PAID })
        );

        await expect(
            service.updatePaymentStatus("order-1", PaymentStatus.PENDING, "emp-1", PORTAL_A)
        ).rejects.toMatchObject({ status: 400 });
        expect(mockOrderRepository.compareAndSetPaymentStatus).not.toHaveBeenCalled();
    });

    it("не возвращает деньги по неоплаченному заказу", async () => {
        await expect(
            service.updatePaymentStatus("order-1", PaymentStatus.REFUNDED, "emp-1", PORTAL_A)
        ).rejects.toMatchObject({ status: 400 });
    });

    it("повтор того же статуса — не ошибка и не второй переход", async () => {
        const result = await service.updatePaymentStatus(
            "order-1",
            PaymentStatus.PENDING,
            "emp-1",
            PORTAL_A
        );

        expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
        expect(mockOrderRepository.compareAndSetPaymentStatus).not.toHaveBeenCalled();
    });

    it("оплату отменённого заказа не трогает", async () => {
        mockOrderRepository.findByIdForPortal.mockResolvedValue(
            order({ status: OrderStatus.CANCELLED })
        );

        await expect(
            service.updatePaymentStatus("order-1", PaymentStatus.PAID, "emp-1", PORTAL_A)
        ).rejects.toMatchObject({ status: 400 });
        expect(mockOrderRepository.compareAndSetPaymentStatus).not.toHaveBeenCalled();
    });
});

describe("OrdersService — заказ из CRM", () => {
    let service: OrdersService;

    const stage = (id: string, semantic: StageSemantic): OrderStage => ({
        id,
        stageCategoryId: "funnel-1",
        name: id,
        nameI18n: null,
        color: null,
        semantic,
        sortOrder: 0,
        isTerminalSuccess: semantic === StageSemantic.SUCCESS,
        isTerminalFailure: semantic === StageSemantic.FAILURE,
    });

    const crmDto = (over: Partial<CrmCreateOrderDto> = {}): CrmCreateOrderDto => ({
        memberId: MEMBER_ID,
        items: [{ productId: PRODUCT_ID, quantity: 2 }],
        ...over,
    });

    const createdInput = (): CreateOrderInput =>
        (mockOrderRepository.create.mock.calls[0] as [CreateOrderInput])[0];

    beforeEach(async () => {
        jest.clearAllMocks();

        mockMembersService.findByIdForPortal.mockResolvedValue({ id: MEMBER_ID, isActive: true });
        mockProductsService.findById.mockResolvedValue({
            id: PRODUCT_ID,
            name: "Товар",
            isActive: true,
            isAvailable: true,
            currentQuantity: new Prisma.Decimal(10),
            price: new Prisma.Decimal(5),
        });
        mockOrderRepository.getLastOrderNumberWithPrefix.mockResolvedValue(null);
        mockOrderRepository.create.mockImplementation(
            (input: CreateOrderInput) =>
                ({ id: "order-1", orderNumber: input.orderNumber }) as Order
        );
        mockOrderRepository.update.mockImplementation(
            (id: string, data: Partial<Order>) => ({ id, ...data }) as Order
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                { provide: OrderRepository, useValue: mockOrderRepository },
                { provide: ProductsService, useValue: mockProductsService },
                { provide: MembersService, useValue: mockMembersService },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
    });

    it("ищет участника в своём портале и отмечает сотрудника", async () => {
        await service.createOrderByEmployee(crmDto(), "emp-1", PORTAL_A);

        expect(mockMembersService.findByIdForPortal).toHaveBeenCalledWith(MEMBER_ID, PORTAL_A);
        expect(createdInput()).toMatchObject({ memberId: MEMBER_ID, employeeId: "emp-1" });
    });

    it("участник чужого клуба — 404, заказ не создаётся", async () => {
        mockMembersService.findByIdForPortal.mockResolvedValue(null);

        await expect(
            service.createOrderByEmployee(crmDto(), "emp-1", PORTAL_A)
        ).rejects.toMatchObject({ status: 404 });
        expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });

    it("неактивному участнику заказ не оформить", async () => {
        mockMembersService.findByIdForPortal.mockResolvedValue({ id: MEMBER_ID, isActive: false });

        await expect(
            service.createOrderByEmployee(crmDto(), "emp-1", PORTAL_A)
        ).rejects.toMatchObject({ status: 400 });
    });

    it("без своей цены берёт цену каталога", async () => {
        await service.createOrderByEmployee(crmDto(), "emp-1", PORTAL_A);

        expect(createdInput().items[0]).toMatchObject({
            unitPrice: 5,
            totalPrice: 10,
            isGift: false,
        });
        expect(createdInput()).toMatchObject({ subtotal: 10, total: 10 });
    });

    it("своя цена сотрудника заменяет цену каталога", async () => {
        await service.createOrderByEmployee(
            crmDto({ items: [{ productId: PRODUCT_ID, quantity: 3, unitPrice: 4.5 }] }),
            "emp-1",
            PORTAL_A
        );

        expect(createdInput().items[0]).toMatchObject({ unitPrice: 4.5, totalPrice: 13.5 });
        expect(createdInput().total).toBe(13.5);
    });

    it("подарок списывается со склада, но не входит в сумму", async () => {
        await service.createOrderByEmployee(
            crmDto({
                items: [
                    { productId: PRODUCT_ID, quantity: 2 },
                    { productId: PRODUCT_ID, quantity: 1, isGift: true },
                ],
            }),
            "emp-1",
            PORTAL_A
        );

        const [paid, gift] = createdInput().items;
        expect(paid).toMatchObject({ totalPrice: 10, isGift: false });
        expect(gift).toMatchObject({ quantity: 1, unitPrice: 5, totalPrice: 0, isGift: true });
        expect(createdInput().total).toBe(10);
    });

    it("создаёт заказ в выбранной стадии и ставит её метку времени", async () => {
        const done = stage("Completed", StageSemantic.SUCCESS);
        mockOrderRepository.findStageInPortal.mockResolvedValue(done);

        const order = await service.createOrderByEmployee(
            crmDto({ stageId: done.id }),
            "emp-1",
            PORTAL_A
        );

        expect(mockOrderRepository.findStageInPortal).toHaveBeenCalledWith(PORTAL_A, done.id);
        expect(createdInput().stageId).toBe(done.id);
        expect(order.completedAt).toBeInstanceOf(Date);
    });

    it("стадия не из воронки клуба — 400", async () => {
        mockOrderRepository.findStageInPortal.mockResolvedValue(null);

        await expect(
            service.createOrderByEmployee(crmDto({ stageId: "foreign" }), "emp-1", PORTAL_A)
        ).rejects.toMatchObject({ status: 400 });
        expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });

    it("сразу в стадию отмены заказ не создаётся", async () => {
        const cancelled = stage("Cancelled", StageSemantic.FAILURE);
        mockOrderRepository.findStageInPortal.mockResolvedValue(cancelled);

        await expect(
            service.createOrderByEmployee(crmDto({ stageId: cancelled.id }), "emp-1", PORTAL_A)
        ).rejects.toMatchObject({ status: 400 });
        expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });
});
