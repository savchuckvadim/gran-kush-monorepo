import {
    assertOpenApiOk,
    type SchemaAdminBillingPlanDto,
    type SchemaAdminPortalSubscriptionDto,
    type SchemaBillingSubscriptionDto,
    type SchemaCreateBillingPlanDto,
    type SchemaManualPaymentDto,
    type SchemaUpdateBillingPlanDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type BillingPlan = SchemaAdminBillingPlanDto;
export type CreateBillingPlanInput = SchemaCreateBillingPlanDto;
export type UpdateBillingPlanInput = SchemaUpdateBillingPlanDto;
export type ClubSubscriptionRow = SchemaAdminPortalSubscriptionDto;
export type ClubSubscription = SchemaBillingSubscriptionDto;
export type SubscriptionStatus = ClubSubscription["status"];
export type ManualPaymentInput = SchemaManualPaymentDto;

export const listBillingPlans = async (): Promise<BillingPlan[]> =>
    assertOpenApiOk(await $api.GET("/platform/admin/billing/plans"));

export const createBillingPlan = async (body: CreateBillingPlanInput): Promise<BillingPlan> =>
    assertOpenApiOk(await $api.POST("/platform/admin/billing/plans", { body }));

export const updateBillingPlan = async (
    code: string,
    body: UpdateBillingPlanInput
): Promise<BillingPlan> =>
    assertOpenApiOk(
        await $api.PATCH("/platform/admin/billing/plans/{code}", {
            params: { path: { code } },
            body,
        })
    );

export const listClubSubscriptions = async (): Promise<ClubSubscriptionRow[]> =>
    assertOpenApiOk(await $api.GET("/platform/admin/billing/subscriptions"));

export const recordManualPayment = async (
    portalId: string,
    body: ManualPaymentInput
): Promise<ClubSubscription> =>
    assertOpenApiOk(
        await $api.POST("/platform/admin/billing/subscriptions/{portalId}/manual-payments", {
            params: { path: { portalId } },
            body,
        })
    );

export const setClubTrialEnd = async (
    portalId: string,
    trialEndsAt: string
): Promise<ClubSubscription> =>
    assertOpenApiOk(
        await $api.PATCH("/platform/admin/billing/subscriptions/{portalId}/trial", {
            params: { path: { portalId } },
            body: { trialEndsAt },
        })
    );
