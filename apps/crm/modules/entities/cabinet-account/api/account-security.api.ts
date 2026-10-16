import {
    assertOpenApiOk,
    type SchemaAccountSecurityDto,
    type SchemaChangeAccountPasswordDto,
} from "@workspace/api-client/core";

import { $cabinetApi } from "@/modules/shared/api";

/** Способы входа аккаунта: задан ли пароль, привязан ли Google. */
export type AccountSecurity = SchemaAccountSecurityDto;

export async function getAccountSecurity(): Promise<AccountSecurity> {
    const response = await $cabinetApi.GET("/cabinet/account/security");
    return assertOpenApiOk<AccountSecurity>(response);
}

/**
 * Задать или сменить пароль. Все сессии аккаунта (и в CRM) отзываются, это устройство получает
 * новую — куки ставит ответ.
 */
export async function setAccountPassword(
    body: SchemaChangeAccountPasswordDto
): Promise<AccountSecurity> {
    const response = await $cabinetApi.PUT("/cabinet/account/security/password", { body });
    return assertOpenApiOk<AccountSecurity>(response);
}

/** Отвязать Google; без пароля API откажет (`password_required`). */
export async function unlinkGoogle(): Promise<AccountSecurity> {
    const response = await $cabinetApi.DELETE("/cabinet/account/security/google");
    return assertOpenApiOk<AccountSecurity>(response);
}

/** Выйти на всех устройствах — в кабинете и в CRM; здешние куки снимает ответ. */
export async function signOutEverywhere(): Promise<void> {
    const response = await $cabinetApi.POST("/cabinet/account/security/sign-out-everywhere");
    await assertOpenApiOk(response);
}
