import { Injectable } from "@nestjs/common";

import { PaymentStatus, Prisma, SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { BILLING_PROVIDERS } from "@modules/billing/domain/billing-providers";
import {
    AdminPortalSubscriptionView,
    ManualPaymentState,
    PortalSubscriptionRepository,
    PortalSubscriptionView,
    ProviderSubscriptionState,
} from "@modules/billing/domain/repositories/portal-subscription-repository.interface";

const subscriptionViewInclude = {
    portal: { select: { name: true } },
    plan: {
        select: {
            id: true,
            code: true,
            name: true,
            priceAmount: true,
            currency: true,
            interval: true,
        },
    },
} as const;

type SubscriptionViewRow = Prisma.PortalSubscriptionGetPayload<{
    include: typeof subscriptionViewInclude;
}>;

@Injectable()
export class PortalSubscriptionPrismaRepository implements PortalSubscriptionRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByPortalId(portalId: string): Promise<PortalSubscriptionView | null> {
        const row = await this.prisma.portalSubscription.findUnique({
            where: { portalId },
            include: subscriptionViewInclude,
        });
        return row ? this.toView(row) : null;
    }

    async findByProviderSubscriptionId(
        providerSubscriptionId: string
    ): Promise<PortalSubscriptionView | null> {
        const row = await this.prisma.portalSubscription.findUnique({
            where: { providerSubscriptionId },
            include: subscriptionViewInclude,
        });
        return row ? this.toView(row) : null;
    }

    async findByProviderCustomerId(
        providerCustomerId: string
    ): Promise<PortalSubscriptionView | null> {
        const row = await this.prisma.portalSubscription.findFirst({
            where: { providerCustomerId },
            include: subscriptionViewInclude,
        });
        return row ? this.toView(row) : null;
    }

    async listForAdmin(): Promise<AdminPortalSubscriptionView[]> {
        const portals = await this.prisma.portal.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                displayName: true,
                createdAt: true,
                subscription: {
                    include: {
                        plan: subscriptionViewInclude.plan,
                    },
                },
            },
        });
        return portals.map(({ subscription, ...portal }) => ({
            portalId: portal.id,
            portalName: portal.name,
            portalDisplayName: portal.displayName,
            portalCreatedAt: portal.createdAt,
            subscription: subscription ? this.toView({ ...subscription, portal }) : null,
        }));
    }

    async linkProvider(
        portalId: string,
        link: { provider: string; providerCustomerId: string; providerSubscriptionId: string | null }
    ): Promise<void> {
        await this.prisma.portalSubscription.update({
            where: { portalId },
            data: {
                provider: link.provider,
                providerCustomerId: link.providerCustomerId,
                ...(link.providerSubscriptionId
                    ? { providerSubscriptionId: link.providerSubscriptionId }
                    : {}),
            },
        });
    }

    async applyProviderState(portalId: string, state: ProviderSubscriptionState): Promise<void> {
        await this.prisma.portalSubscription.update({
            where: { portalId },
            data: {
                provider: state.provider,
                providerCustomerId: state.providerCustomerId,
                providerSubscriptionId: state.providerSubscriptionId,
                ...(state.status ? { status: state.status } : {}),
                ...(state.planId ? { planId: state.planId } : {}),
                currentPeriodStart: state.currentPeriodStart,
                currentPeriodEnd: state.currentPeriodEnd,
                cancelAtPeriodEnd: state.cancelAtPeriodEnd,
                graceEndsAt: state.graceEndsAt,
            },
        });
    }

    async applyManualPayment(portalId: string, state: ManualPaymentState): Promise<void> {
        const update = this.prisma.portalSubscription.update({
            where: { portalId },
            data: {
                status: SubscriptionStatus.active,
                planId: state.planId,
                provider: BILLING_PROVIDERS.MANUAL,
                currentPeriodStart: state.currentPeriodStart,
                currentPeriodEnd: state.currentPeriodEnd,
                graceEndsAt: null,
                cancelAtPeriodEnd: false,
            },
        });
        const payment = this.prisma.payment.create({
            data: {
                portalId,
                provider: BILLING_PROVIDERS.MANUAL,
                externalId: state.payment.externalId,
                amount: new Prisma.Decimal(state.payment.amount),
                currency: state.payment.currency,
                status: PaymentStatus.succeeded,
                paidAt: state.payment.paidAt,
                periodStart: state.currentPeriodStart,
                periodEnd: state.currentPeriodEnd,
            },
        });
        await this.prisma.$transaction([update, payment]);
    }

    async setTrialEnd(portalId: string, trialEndsAt: Date): Promise<void> {
        await this.prisma.portalSubscription.update({
            where: { portalId },
            data: { status: SubscriptionStatus.trialing, trialEndsAt, graceEndsAt: null },
        });
    }

    private toView(row: SubscriptionViewRow): PortalSubscriptionView {
        return {
            id: row.id,
            portalId: row.portalId,
            portalSlug: row.portal.name,
            status: row.status,
            plan: {
                id: row.plan.id,
                code: row.plan.code,
                name: row.plan.name,
                priceAmount: row.plan.priceAmount.toFixed(2),
                currency: row.plan.currency,
                interval: row.plan.interval,
            },
            trialEndsAt: row.trialEndsAt,
            currentPeriodStart: row.currentPeriodStart,
            currentPeriodEnd: row.currentPeriodEnd,
            graceEndsAt: row.graceEndsAt,
            cancelAtPeriodEnd: row.cancelAtPeriodEnd,
            provider: row.provider,
            providerCustomerId: row.providerCustomerId,
            providerSubscriptionId: row.providerSubscriptionId,
        };
    }
}
