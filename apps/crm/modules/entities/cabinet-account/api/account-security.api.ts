import {
    assertOpenApiOk,
    type SchemaAccountSecurityDto,
    type SchemaChangeAccountPasswordDto,
} from "@workspace/api-client/core";

import { $cabinetApi } from "@/modules/shared/api";

import type { SignInProviderKey, WidgetPayload } from "./identity-auth.api";

/** Способы входа аккаунта: задан ли пароль, какие провайдеры привязаны. */
export type AccountSecurity = SchemaAccountSecurityDto;
export type SignInMethod = AccountSecurity["methods"][number];

export async function getAccountSecurity(): Promise<AccountSecurity> {
    const response = await $cabinetApi.GET("/cabinet/account/security");
    return assertOpenApiOk<AccountSecurity>(response);
}

/** Задать или сменить пароль. Остальные сессии аккаунта (и в CRM) отзываются, эта остаётся. */
export async function setAccountPassword(
    body: SchemaChangeAccountPasswordDto
): Promise<AccountSecurity> {
    const response = await $cabinetApi.PUT("/cabinet/account/security/password", { body });
    return assertOpenApiOk<AccountSecurity>(response);
}

/** Привязать виджет-провайдера (Telegram) подписанным ответом виджета. */
export async function linkWidgetProvider(input: {
    provider: SignInProviderKey;
    payload: WidgetPayload;
}): Promise<AccountSecurity> {
    const response = await $cabinetApi.POST("/cabinet/account/security/{provider}", {
        params: { path: { provider: input.provider } },
        body: { payload: input.payload },
    });
    return assertOpenApiOk<AccountSecurity>(response);
}

/** Отвязать способ входа; последний API не снимет (`last_sign_in_method`). */
export async function unlinkProvider(provider: SignInProviderKey): Promise<AccountSecurity> {
    const response = await $cabinetApi.DELETE("/cabinet/account/security/{provider}", {
        params: { path: { provider } },
    });
    return assertOpenApiOk<AccountSecurity>(response);
}

/** Выйти на всех устройствах — в кабинете и в CRM; здешние куки снимает ответ. */
export async function signOutEverywhere(): Promise<void> {
    const response = await $cabinetApi.POST("/cabinet/account/security/sign-out-everywhere");
    await assertOpenApiOk(response);
}
