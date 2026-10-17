import {
    assertOpenApiOk,
    type SchemaAccountSessionsResponseDto,
    type SchemaEndedSessionsResponseDto,
    type SchemaIdentityProvidersResponseDto,
} from "@workspace/api-client/core";

import { $api, API_BASE_URL } from "@/modules/shared/api";

import type { AccountSecurity, AccountSecurityClient } from "../model/account-security-client";

/** «Вход и безопасность» CRM: `/crm/account/*`, куки CRM. */
export const crmAccountSecurity: AccountSecurityClient = {
    audience: "crm",
    getSecurity: async () =>
        assertOpenApiOk<AccountSecurity>(await $api.GET("/crm/account/security")),
    setPassword: async (body) =>
        assertOpenApiOk<AccountSecurity>(
            await $api.PUT("/crm/account/security/password", { body })
        ),
    linkWidget: async ({ provider, payload }) =>
        assertOpenApiOk<AccountSecurity>(
            await $api.POST("/crm/account/security/{provider}", {
                params: { path: { provider } },
                body: { payload },
            })
        ),
    unlink: async (provider) =>
        assertOpenApiOk<AccountSecurity>(
            await $api.DELETE("/crm/account/security/{provider}", {
                params: { path: { provider } },
            })
        ),
    signOutEverywhere: async () => {
        await assertOpenApiOk(await $api.POST("/crm/account/security/sign-out-everywhere"));
    },
    listSessions: async () =>
        (
            await assertOpenApiOk<SchemaAccountSessionsResponseDto>(
                await $api.GET("/crm/account/sessions")
            )
        ).sessions,
    endSession: async (id) => {
        await assertOpenApiOk(
            await $api.DELETE("/crm/account/sessions/{id}", {
                params: { path: { id } },
            })
        );
    },
    endOtherSessions: async () =>
        (
            await assertOpenApiOk<SchemaEndedSessionsResponseDto>(
                await $api.POST("/crm/account/sessions/sign-out-others")
            )
        ).ended,
    listProviders: async () =>
        (
            await assertOpenApiOk<SchemaIdentityProvidersResponseDto>(
                await $api.GET("/crm/auth/providers")
            )
        ).providers,
    linkUrl: (provider, locale) =>
        `${API_BASE_URL}/crm/auth/${provider}/link?${new URLSearchParams({ locale })}`,
};
