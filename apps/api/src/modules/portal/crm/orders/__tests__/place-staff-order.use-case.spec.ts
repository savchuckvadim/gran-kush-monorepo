import { Test, TestingModule } from "@nestjs/testing";

import { EmployeeRole, Prisma, StageSemantic } from "@prisma/client";

import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { MemberAccessService } from "@modules/portal/crm/club-policy/application/services/member-access.service";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import { CrmCreateOrderDto } from "@modules/portal/crm/orders/api/dto/order.dto";
import { OrderPlacementService } from "@modules/portal/crm/orders/application/services/order-placement.service";
import { PlaceStaffOrderUseCase } from "@modules/portal/crm/orders/application/use-cases/place-staff-order.use-case";
import { Order } from "@modules/portal/crm/orders/domain/entity/order.entity";
import { OrderStage } from "@modules/portal/crm/orders/domain/entity/order-stage.entity";
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

const mockMemberAccess = { assertStaffMayOrderFor: jest.fn() };

describe("PlaceStaffOrderUseCase — заказ из CRM", () => {
    let useCase: PlaceStaffOrderUseCase;
    const admin = { id: "emp-1", userId: "user-emp-1", role: EmployeeRole.admin };
    const employee = { ...admin, role: EmployeeRole.employee };

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
                PlaceStaffOrderUseCase,
                OrderPlacementService,
                { provide: OrderRepository, useValue: mockOrderRepository },
                { provide: ProductsService, useValue: mockProductsService },
                { provide: MembersService, useValue: mockMembersService },
                { provide: MemberAccessService, useValue: mockMemberAccess },
            ],
        }).compile();

        useCase = module.get(PlaceStaffOrderUseCase);
    });

    it("ищет участника в своём портале и отмечает сотрудника", async () => {
        await useCase.execute(crmDto(), admin, PORTAL_A);

        expect(mockMembersService.findByIdForPortal).toHaveBeenCalledWith(MEMBER_ID, PORTAL_A);
        expect(createdInput()).toMatchObject({ memberId: MEMBER_ID, employeeId: "emp-1" });
    });

    it("участник чужого клуба — 404, заказ не создаётся", async () => {
        mockMembersService.findByIdForPortal.mockResolvedValue(null);

        await expect(useCase.execute(crmDto(), admin, PORTAL_A)).rejects.toMatchObject({
            status: 404,
        });
        expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });

    it("неактивному участнику заказ не оформить", async () => {
        mockMembersService.findByIdForPortal.mockResolvedValue({ id: MEMBER_ID, isActive: false });

        await expect(useCase.execute(crmDto(), admin, PORTAL_A)).rejects.toMatchObject({
            status: 400,
        });
    });

    it("без своей цены берёт цену каталога", async () => {
        await useCase.execute(crmDto(), admin, PORTAL_A);

        expect(createdInput().items[0]).toMatchObject({
            unitPrice: 5,
            totalPrice: 10,
            isGift: false,
        });
        expect(createdInput()).toMatchObject({ subtotal: 10, total: 10 });
    });

    it("своя цена сотрудника заменяет цену каталога", async () => {
        await useCase.execute(
            crmDto({ items: [{ productId: PRODUCT_ID, quantity: 3, unitPrice: 4.5 }] }),
            admin,
            PORTAL_A
        );

        expect(createdInput().items[0]).toMatchObject({ unitPrice: 4.5, totalPrice: 13.5 });
        expect(createdInput().total).toBe(13.5);
    });

    it("подарок списывается со склада, но не входит в сумму", async () => {
        await useCase.execute(
            crmDto({
                items: [
                    { productId: PRODUCT_ID, quantity: 2 },
                    { productId: PRODUCT_ID, quantity: 1, isGift: true },
                ],
            }),
            admin,
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

        const order = await useCase.execute(crmDto({ stageId: done.id }), admin, PORTAL_A);

        expect(mockOrderRepository.findStageInPortal).toHaveBeenCalledWith(PORTAL_A, done.id);
        expect(createdInput().stageId).toBe(done.id);
        expect(order.completedAt).toBeInstanceOf(Date);
    });

    it("стадия не из воронки клуба — 400", async () => {
        mockOrderRepository.findStageInPortal.mockResolvedValue(null);

        await expect(
            useCase.execute(crmDto({ stageId: "foreign" }), admin, PORTAL_A)
        ).rejects.toMatchObject({ status: 400 });
        expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });

    it("сразу в стадию отмены заказ не создаётся", async () => {
        const cancelled = stage("Cancelled", StageSemantic.FAILURE);
        mockOrderRepository.findStageInPortal.mockResolvedValue(cancelled);

        await expect(
            useCase.execute(crmDto({ stageId: cancelled.id }), admin, PORTAL_A)
        ).rejects.toMatchObject({ status: 400 });
        expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });
    it("стадию нового заказа выбирает только manager+", async () => {
        await expect(
            useCase.execute(crmDto({ stageId: "any" }), employee, PORTAL_A)
        ).rejects.toMatchObject({ status: 403 });
        expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });

    it("заказ на свою запись участника проверяют правила клуба", async () => {
        await useCase.execute(crmDto(), admin, PORTAL_A);

        expect(mockMemberAccess.assertStaffMayOrderFor).toHaveBeenCalledWith(
            admin.userId,
            MEMBER_ID,
            PORTAL_A
        );
    });
});
