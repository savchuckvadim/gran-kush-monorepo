import { ConflictException, ServiceUnavailableException } from "@nestjs/common";

import { SubscriptionStatus } from "@prisma/client";

import { AdminBillingService } from "@modules/billing/application/services/admin-billing.service";
import { BillingProvider } from "@modules/billing/domain/billing-provider.interface";
import { BillingPlanRepository } from "@modules/billing/domain/repositories/billing-plan-repository.interface";
import {
    PortalSubscriptionRepository,
    PortalSubscriptionView,
} from "@modules/billing/domain/repositories/portal-subscription-repository.interface";

const subscriptionView = (patch: Partial<PortalSubscriptionView> = {}): PortalSubscriptionView => ({
    id: "sub-1",
    portalId: "portal-1",
    portalSlug: "club",
    status: SubscriptionStatus.trialing,
    plan: {
        id: "plan-club",
        code: "club-month",
        name: "Club",
        priceAmount: "49.00",
        currency: "EUR",
        interval: "month",
    },
    trialEndsAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    graceEndsAt: null,
    cancelAtPeriodEnd: false,
    provider: null,
    providerCustomerId: null,
    providerSubscriptionId: null,
    ...patch,
});

const build = (options: { configured?: boolean; subscription?: PortalSubscriptionView } = {}) => {
    const provider = {
        isConfigured: jest.fn(() => options.configured ?? true),
        retrievePrice: jest.fn().mockResolvedValue({
            id: "price_5",
            amount: "5.00",
            currency: "EUR",
            interval: "month",
            intervalCount: 1,
            active: true,
            productName: "PafPaf Prueba",
        }),
    } as unknown as BillingProvider;
    const plans = {
        findByCode: jest.fn().mockResolvedValue(null),
        create: jest.fn(async (input) => ({ id: "new", ...input })),
    } as unknown as BillingPlanRepository;
    const subscriptions = {
        findByPortalId: jest.fn().mockResolvedValue(options.subscription ?? subscriptionView()),
        applyManualPayment: jest.fn(),
        setTrialEnd: jest.fn(),
    } as unknown as PortalSubscriptionRepository;
    return {
        service: new AdminBillingService(provider, plans, subscriptions),
        provider,
        plans,
        subscriptions,
    };
};

describe("AdminBillingService", () => {
    describe("plans", () => {
        it("takes amount, currency and interval from the Stripe price, not from the form", async () => {
            const { service, plans } = build();

            await service.createPlan({
                code: "prueba-month",
                stripePriceId: "price_5",
                priceAmount: "99.00",
                isPublic: false,
            });

            expect(plans.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: "prueba-month",
                    name: "PafPaf Prueba",
                    priceAmount: "5.00",
                    currency: "EUR",
                    interval: "month",
                    isPublic: false,
                    stripePriceId: "price_5",
                })
            );
        });

        it("refuses a Stripe price while Stripe keys are missing", async () => {
            const { service } = build({ configured: false });

            await expect(
                service.createPlan({ code: "club-month", stripePriceId: "price_5" })
            ).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it("a plan without Stripe is for manual payments and needs a price", async () => {
            const { service, plans } = build({ configured: false });

            await service.createPlan({ code: "cash-month", priceAmount: "40.00" });

            expect(plans.create).toHaveBeenCalledWith(
                expect.objectContaining({ priceAmount: "40.00", stripePriceId: null })
            );
        });
    });

    describe("manual payment", () => {
        it("charges plan price × months and activates from today", async () => {
            const { service, subscriptions } = build();
            const before = Date.now();

            await service.recordManualPayment("portal-1", { months: 3 });

            const [, state] = (subscriptions.applyManualPayment as jest.Mock).mock.calls[0];
            expect(state.payment.amount).toBe("147.00");
            expect(state.currentPeriodStart.getTime()).toBeGreaterThanOrEqual(before);
            const months =
                (state.currentPeriodEnd.getUTCFullYear() - state.currentPeriodStart.getUTCFullYear()) * 12 +
                state.currentPeriodEnd.getUTCMonth() -
                state.currentPeriodStart.getUTCMonth();
            expect(months).toBe(3);
        });

        it("extends a running paid period from its end, not from today", async () => {
            const paidUntil = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
            const { service, subscriptions } = build({
                subscription: subscriptionView({
                    status: SubscriptionStatus.active,
                    provider: "manual",
                    currentPeriodEnd: paidUntil,
                }),
            });

            await service.recordManualPayment("portal-1", { months: 1, amount: "45.00" });

            const [, state] = (subscriptions.applyManualPayment as jest.Mock).mock.calls[0];
            expect(state.currentPeriodStart).toEqual(paidUntil);
            expect(state.payment.amount).toBe("45.00");
        });

        it("does not touch a club that Stripe bills", async () => {
            const { service, subscriptions } = build({
                subscription: subscriptionView({
                    status: SubscriptionStatus.active,
                    provider: "stripe",
                    providerSubscriptionId: "sub_1",
                }),
            });

            await expect(service.recordManualPayment("portal-1", { months: 1 })).rejects.toBeInstanceOf(
                ConflictException
            );
            expect(subscriptions.applyManualPayment).not.toHaveBeenCalled();
        });
    });
});
