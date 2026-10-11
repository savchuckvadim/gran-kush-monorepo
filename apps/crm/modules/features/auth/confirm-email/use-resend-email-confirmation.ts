"use client";

import { useLocale } from "next-intl";

import { useMutation } from "@tanstack/react-query";

import { assertOpenApiOk } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

import { toMailLocale } from "../lib/credentials";

/** Sends the confirmation letter again; works only with a CRM session. */
export function useResendEmailConfirmation() {
    const locale = useLocale();

    return useMutation({
        mutationFn: async () =>
            assertOpenApiOk(
                await $api.POST("/crm/auth/confirm-email/resend", {
                    body: { locale: toMailLocale(locale) },
                })
            ),
    });
}
