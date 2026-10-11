"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiClientError } from "@workspace/api-client/core";

import {
    createBillingPlan,
    type CreateBillingPlanInput,
    listBillingPlans,
    listClubSubscriptions,
    type ManualPaymentInput,
    recordManualPayment,
    setClubTrialEnd,
    updateBillingPlan,
    type UpdateBillingPlanInput,
} from "./api";

const billingKeys = {
    plans: ["billing", "plans"] as const,
    subscriptions: ["billing", "subscriptions"] as const,
};

// 4xx не лечится повтором, а 401 должен сразу увести на вход
const retryServerErrors = (failureCount: number, error: unknown): boolean =>
    !(error instanceof ApiClientError && error.status < 500) && failureCount < 2;

export const useBillingPlans = () =>
    useQuery({
        queryKey: billingKeys.plans,
        queryFn: listBillingPlans,
        retry: retryServerErrors,
    });

export const useClubSubscriptions = () =>
    useQuery({
        queryKey: billingKeys.subscriptions,
        queryFn: listClubSubscriptions,
        retry: retryServerErrors,
    });

export const useCreateBillingPlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateBillingPlanInput) => createBillingPlan(body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.plans }),
    });
};

export const useUpdateBillingPlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ code, body }: { code: string; body: UpdateBillingPlanInput }) =>
            updateBillingPlan(code, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.plans }),
    });
};

export const useRecordManualPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ portalId, body }: { portalId: string; body: ManualPaymentInput }) =>
            recordManualPayment(portalId, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.subscriptions }),
    });
};

export const useSetClubTrialEnd = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ portalId, trialEndsAt }: { portalId: string; trialEndsAt: string }) =>
            setClubTrialEnd(portalId, trialEndsAt),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.subscriptions }),
    });
};
