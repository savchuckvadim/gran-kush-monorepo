import {
    assertOpenApiOk,
    type SchemaAccountSessionsResponseDto,
    type SchemaEndedSessionsResponseDto,
    type SchemaIdentityProvidersResponseDto,
} from "@workspace/api-client/core";

import { $cabinetApi, API_BASE_URL } from "@/modules/shared/api";

import type { AccountSecurity, AccountSecurityClient } from "../model/account-security-client";

/** «Вход и безопасность» кабинета: `/cabinet/account/*`, куки кабинета. */
export const cabinetAccountSecurity: AccountSecurityClient = {
    audience: "cabinet",
    getSecurity: async () =>
        assertOpenApiOk<AccountSecurity>(await $cabinetApi.GET("/cabinet/account/security")),
    setPassword: async (body) =>
        assertOpenApiOk<AccountSecurity>(
            await $cabinetApi.PUT("/cabinet/account/security/password", { body })
        ),
    linkWidget: async ({ provider, payload }) =>
        assertOpenApiOk<AccountSecurity>(
            await $cabinetApi.POST("/cabinet/account/security/{provider}", {
                params: { path: { provider } },
                body: { payload },
            })
        ),
    unlink: async (provider) =>
        assertOpenApiOk<AccountSecurity>(
            await $cabinetApi.DELETE("/cabinet/account/security/{provider}", {
                params: { path: { provider } },
            })
        ),
    signOutEverywhere: async () => {
        await assertOpenApiOk(
            await $cabinetApi.POST("/cabinet/account/security/sign-out-everywhere")
        );
    },
    listSessions: async () =>
        (
            await assertOpenApiOk<SchemaAccountSessionsResponseDto>(
                await $cabinetApi.GET("/cabinet/account/sessions")
            )
        ).sessions,
    endSession: async (id) => {
        await assertOpenApiOk(
            await $cabinetApi.DELETE("/cabinet/account/sessions/{id}", {
                params: { path: { id } },
            })
        );
    },
    endOtherSessions: async () =>
        (
            await assertOpenApiOk<SchemaEndedSessionsResponseDto>(
                await $cabinetApi.POST("/cabinet/account/sessions/sign-out-others")
            )
        ).ended,
    listProviders: async () =>
        (
            await assertOpenApiOk<SchemaIdentityProvidersResponseDto>(
                await $cabinetApi.GET("/cabinet/auth/providers")
            )
        ).providers,
    linkUrl: (provider, locale) =>
        `${API_BASE_URL}/cabinet/auth/${provider}/link?${new URLSearchParams({ locale })}`,
};
