import { ApiProperty } from "@nestjs/swagger";

import { SubscriptionStatus } from "@prisma/client";

import { PortalSubscriptionView } from "@modules/billing/domain/repositories/portal-subscription-repository.interface";

export class BillingSubscriptionPlanDto {
    @ApiProperty({ type: String, example: "club-month" })
    code: string;

    @ApiProperty({ type: String, example: "Club" })
    name: string;

    @ApiProperty({ type: String, example: "49.00" })
    priceAmount: string;

    @ApiProperty({ type: String, example: "EUR" })
    currency: string;

    @ApiProperty({ type: String, example: "month" })
    interval: string;
}

export class BillingSubscriptionDto {
    @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.trialing })
    status: SubscriptionStatus;

    @ApiProperty({ type: BillingSubscriptionPlanDto })
    plan: BillingSubscriptionPlanDto;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    trialEndsAt: string | null;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    currentPeriodEnd: string | null;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    graceEndsAt: string | null;

    @ApiProperty({
        type: Boolean,
        description: "Отменена и закончится в конце оплаченного периода",
    })
    cancelAtPeriodEnd: boolean;

    @ApiProperty({
        type: String,
        nullable: true,
        example: "stripe",
        description:
            "stripe — списания делает Stripe; manual — продление из админки; null — оплаты не было",
    })
    provider: string | null;
}

export const toBillingSubscriptionDto = (view: PortalSubscriptionView): BillingSubscriptionDto => ({
    status: view.status,
    plan: {
        code: view.plan.code,
        name: view.plan.name,
        priceAmount: view.plan.priceAmount,
        currency: view.plan.currency,
        interval: view.plan.interval,
    },
    trialEndsAt: view.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: view.currentPeriodEnd?.toISOString() ?? null,
    graceEndsAt: view.graceEndsAt?.toISOString() ?? null,
    cancelAtPeriodEnd: view.cancelAtPeriodEnd,
    provider: view.provider,
});
