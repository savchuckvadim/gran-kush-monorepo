import {
    assertOpenApiOk,
    type SchemaAccountSecurityDto,
    type SchemaTelegramAuthDto,
    type SchemaTelegramConfigDto,
    type SchemaTelegramSignInResultDto,
    type SchemaTelegramStatusDto,
} from "@workspace/api-client/core";

import { $cabinetApi } from "@/modules/shared/api";

/** Подписанный ответ виджета Telegram Login — передаётся API как есть. */
export type TelegramWidgetUser = SchemaTelegramAuthDto;

export async function getTelegramConfig(): Promise<SchemaTelegramConfigDto> {
    const response = await $cabinetApi.GET("/cabinet/auth/telegram/config");
    return assertOpenApiOk<SchemaTelegramConfigDto>(response);
}

/** Привязанный Telegram входит (куки ставит ответ); новый получает билет на шаг «укажите почту». */
export async function signInWithTelegram(
    user: TelegramWidgetUser
): Promise<SchemaTelegramSignInResultDto> {
    const response = await $cabinetApi.POST("/cabinet/auth/telegram", { body: user });
    return assertOpenApiOk<SchemaTelegramSignInResultDto>(response);
}

/** Шаг «укажите почту»: на адрес уходит ссылка; ответ одинаковый для любой почты. */
export async function requestTelegramEmail(body: {
    ticket: string;
    email: string;
}): Promise<SchemaTelegramStatusDto> {
    const response = await $cabinetApi.POST("/cabinet/auth/telegram/email", { body });
    return assertOpenApiOk<SchemaTelegramStatusDto>(response);
}

/** Ссылка из письма: вход с новым аккаунтом или с Telegram, привязанным к существующему. */
export async function confirmTelegramEmail(token: string): Promise<SchemaTelegramStatusDto> {
    const response = await $cabinetApi.POST("/cabinet/auth/telegram/confirm", { body: { token } });
    return assertOpenApiOk<SchemaTelegramStatusDto>(response);
}

export async function linkTelegram(user: TelegramWidgetUser): Promise<SchemaAccountSecurityDto> {
    const response = await $cabinetApi.POST("/cabinet/account/security/telegram", { body: user });
    return assertOpenApiOk<SchemaAccountSecurityDto>(response);
}

/** Последний способ входа API не снимет (`last_sign_in_method`). */
export async function unlinkTelegram(): Promise<SchemaAccountSecurityDto> {
    const response = await $cabinetApi.DELETE("/cabinet/account/security/telegram");
    return assertOpenApiOk<SchemaAccountSecurityDto>(response);
}
