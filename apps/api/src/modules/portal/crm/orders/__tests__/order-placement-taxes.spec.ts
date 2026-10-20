import { Test } from "@nestjs/testing";

import { Prisma, TaxTreatment } from "@prisma/client";

import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { MemberLimitService } from "@modules/portal/crm/club-policy/application/services/member-limit.service";
import { TaxPolicyService } from "@modules/portal/crm/finance/application/services/tax-policy.service";
import type { LineTaxRule } from "@modules/portal/crm/finance/domain/tax/tax-split";
import { OrderPlacementService } from "@modules/portal/crm/orders/application/services/order-placement.service";
import type { Order } from "@modules/portal/crm/orders/domain/entity/order.entity";
import {
    type CreateOrderInput,
    OrderRepository,
} from "@modules/portal/crm/orders/domain/repositories/order-repository.interface";

const PORTAL = "portal-tax";
const INCLUDED = "product-included";
const ON_TOP = "product-on-top";

const products: Record<string, { price: number; priceIncludesTax: boolean | null }> = {
    [INCLUDED]: { price: 12.1, priceIncludesTax: null },
    [ON_TOP]: { price: 10, priceIncludesTax: false },
};

const vat21 = (includesTax: boolean): LineTaxRule => ({
    percent: 21,
    treatment: TaxTreatment.taxable,
    includesTax,
});

/** Налог строк при оформлении (TASK-797): снимок в строке, база и налог — в заказе. */
describe("OrderPlacementService — налог строк", () => {
    const create = jest.fn(
        (input: CreateOrderInput) => ({ id: "order-1", ...input }) as unknown as Order
    );
    const rulesFor = jest.fn();
    let service: OrderPlacementService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                OrderPlacementService,
                {
                    provide: OrderRepository,
                    useValue: {
                        create,
                        getLastOrderNumberWithPrefix: jest.fn().mockResolvedValue(null),
                    },
                },
                {
                    provide: ProductsService,
                    useValue: {
                        findById: jest.fn((id: string) => ({
                            id,
                            name: id,
                            isActive: true,
                            isAvailable: true,
                            currentQuantity: new Prisma.Decimal(100),
                            price: new Prisma.Decimal(products[id].price),
                            taxRateId: null,
                            priceIncludesTax: products[id].priceIncludesTax,
                        })),
                    },
                },
                {
                    provide: MemberLimitService,
                    useValue: { settingsOf: jest.fn().mockResolvedValue({ limitGrams: null }) },
                },
                { provide: TaxPolicyService, useValue: { rulesFor } },
            ],
        }).compile();
        service = module.get(OrderPlacementService);
    });

    const placed = (): CreateOrderInput => create.mock.calls[0][0];

    it("цена с налогом — итог не меняется; налог сверху — итог больше; подарок — нули", async () => {
        rulesFor.mockResolvedValue(
            new Map([
                [INCLUDED, vat21(true)],
                [ON_TOP, vat21(false)],
            ])
        );
        await service.place(PORTAL, {
            memberId: "member-1",
            items: [
                { productId: INCLUDED, quantity: 1 },
                { productId: ON_TOP, quantity: 1 },
                { productId: INCLUDED, quantity: 1, isGift: true },
            ],
        });

        const order = placed();
        expect(order.items.map((item) => [item.totalPrice, item.tax])).toEqual([
            [12.1, { percent: 21, treatment: "taxable", net: 10, tax: 2.1 }],
            [12.1, { percent: 21, treatment: "taxable", net: 10, tax: 2.1 }],
            [0, { percent: 21, treatment: "taxable", net: 0, tax: 0 }],
        ]);
        expect(order).toMatchObject({ subtotal: 24.2, total: 24.2, netTotal: 20, taxTotal: 4.2 });
    });

    it("финансы выключены — заказ без разбивки, суммы по цене каталога", async () => {
        rulesFor.mockResolvedValue(null);
        await service.place(PORTAL, {
            memberId: "member-1",
            items: [{ productId: ON_TOP, quantity: 2 }],
        });

        const order = placed();
        expect(order.items[0]).toMatchObject({ totalPrice: 20 });
        expect(order.items[0].tax).toBeUndefined();
        expect(order).toMatchObject({ total: 20, netTotal: null, taxTotal: null });
    });
});
