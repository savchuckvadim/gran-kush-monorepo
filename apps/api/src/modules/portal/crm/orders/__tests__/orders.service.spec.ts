import { Test, TestingModule } from "@nestjs/testing";

import { OrdersService } from "@modules/portal/crm/orders/application/services/orders.service";
import {
    Order,
    OrderStatus,
    PaymentStatus,
} from "@modules/portal/crm/orders/domain/entity/order.entity";
import { OrderRepository } from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

const PORTAL_A = "portal-a";

const mockOrderRepository = {
    findByIdForPortal: jest.fn(),
    update: jest.fn(),
    compareAndSetPaymentStatus: jest.fn(),
};

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
            providers: [OrdersService, { provide: OrderRepository, useValue: mockOrderRepository }],
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
            // событие оплаты пишется в транзакции перехода; суммы в нём нет
            events: [
                expect.objectContaining({
                    name: "order.payment_changed",
                    portalId: PORTAL_A,
                    actor: { kind: "employee", id: "emp-1" },
                    payload: expect.objectContaining({ from: "pending", to: "paid" }),
                }),
            ],
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
