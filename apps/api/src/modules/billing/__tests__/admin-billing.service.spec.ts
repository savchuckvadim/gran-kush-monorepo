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
    const createPlan = jest.fn(async (input: object) => ({ id: "new", ...input }));
    const plans = {
        findByCode: jest.fn().mockResolvedValue(null),
        create: createPlan,
    } as unknown as BillingPlanRepository;
    const applyManualPayment = jest.fn();
    const subscriptions = {
        findByPortalId: jest.fn().mockResolvedValue(options.subscription ?? subscriptionView()),
        applyManualPayment,
        setTrialEnd: jest.fn(),
    } as unknown as PortalSubscriptionRepository;
    return {
        service: new AdminBillingService(provider, plans, subscriptions),
        createPlan,
        applyManualPayment,
    };
};

describe("AdminBillingService", () => {
    describe("plans", () => {
        it("takes amount, currency and interval from the Stripe price, not from the form", async () => {
            const { service, createPlan } = build();

            await service.createPlan({
                code: "prueba-month",
                stripePriceId: "price_5",
                priceAmount: "99.00",
                isPublic: false,
            });

            expect(createPlan).toHaveBeenCalledWith(
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
            const { service, createPlan } = build({ configured: false });

            await service.createPlan({ code: "cash-month", priceAmount: "40.00" });

            expect(createPlan).toHaveBeenCalledWith(
                expect.objectContaining({ priceAmount: "40.00", stripePriceId: null })
            );
        });
    });

    describe("manual payment", () => {
        it("charges plan price × months and activates from today", async () => {
            const { service, applyManualPayment } = build();
            const before = Date.now();

            await service.recordManualPayment("portal-1", { months: 3 });

            const [, state] = applyManualPayment.mock.calls[0];
            expect(state.payment.amount).toBe("147.00");
            expect(state.currentPeriodStart.getTime()).toBeGreaterThanOrEqual(before);
            const months =
                (state.currentPeriodEnd.getUTCFullYear() -
                    state.currentPeriodStart.getUTCFullYear()) *
                    12 +
                state.currentPeriodEnd.getUTCMonth() -
                state.currentPeriodStart.getUTCMonth();
            expect(months).toBe(3);
        });

        it("a yearly plan defaults to its monthly share × months", async () => {
            const { service, applyManualPayment } = build({
                subscription: subscriptionView({
                    plan: {
                        id: "plan-club-year",
                        code: "club-year",
                        name: "Club",
                        priceAmount: "468.00",
                        currency: "EUR",
                        interval: "year",
                    },
                }),
            });

            await service.recordManualPayment("portal-1", { months: 3 });

            const [, state] = applyManualPayment.mock.calls[0];
            expect(state.payment.amount).toBe("117.00");
        });

        it("extends a running paid period from its end, not from today", async () => {
            const paidUntil = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
            const { service, applyManualPayment } = build({
                subscription: subscriptionView({
                    status: SubscriptionStatus.active,
                    provider: "manual",
                    currentPeriodEnd: paidUntil,
                }),
            });

            await service.recordManualPayment("portal-1", { months: 1, amount: "45.00" });

            const [, state] = applyManualPayment.mock.calls[0];
            expect(state.currentPeriodStart).toEqual(paidUntil);
            expect(state.payment.amount).toBe("45.00");
        });

        it("does not touch a club that Stripe bills", async () => {
            const { service, applyManualPayment } = build({
                subscription: subscriptionView({
                    status: SubscriptionStatus.active,
                    provider: "stripe",
                    providerSubscriptionId: "sub_1",
                }),
            });

            await expect(
                service.recordManualPayment("portal-1", { months: 1 })
            ).rejects.toBeInstanceOf(ConflictException);
            expect(applyManualPayment).not.toHaveBeenCalled();
        });
    });
});
