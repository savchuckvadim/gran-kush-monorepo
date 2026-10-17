import {
    assertOpenApiOk,
    type SchemaIdentityProviderDto,
    type SchemaIdentitySignInResultDto,
    type SchemaIdentityStatusDto,
} from "@workspace/api-client/core";

import { $cabinetApi } from "@/modules/shared/api";

/** Способ входа кабинета из реестра API и параметры его кнопки. */
export type SignInProvider = SchemaIdentityProviderDto;
export type SignInProviderKey = SignInProvider["key"];

/** Подписанный ответ виджета провайдера — уходит в API как есть. */
export type WidgetPayload = Record<string, unknown>;

/** Привязанный способ входит (куки ставит ответ); новый без почты получает билет шага почты. */
export async function verifyWidgetSignIn(input: {
    provider: SignInProviderKey;
    payload: WidgetPayload;
}): Promise<SchemaIdentitySignInResultDto> {
    const response = await $cabinetApi.POST("/cabinet/auth/{provider}/verify", {
        params: { path: { provider: input.provider } },
        body: { payload: input.payload },
    });
    return assertOpenApiOk<SchemaIdentitySignInResultDto>(response);
}

/** Шаг «укажите почту»: на адрес уходит ссылка; ответ одинаковый для любой почты. */
export async function requestIdentityEmail(body: {
    ticket: string;
    email: string;
}): Promise<SchemaIdentityStatusDto> {
    const response = await $cabinetApi.POST("/cabinet/auth/identity/email", { body });
    return assertOpenApiOk<SchemaIdentityStatusDto>(response);
}

/** Ссылка из письма: вход с новым аккаунтом или со способом, привязанным к существующему. */
export async function confirmIdentityEmail(token: string): Promise<SchemaIdentityStatusDto> {
    const response = await $cabinetApi.POST("/cabinet/auth/identity/confirm", {
        body: { token },
    });
    return assertOpenApiOk<SchemaIdentityStatusDto>(response);
}
