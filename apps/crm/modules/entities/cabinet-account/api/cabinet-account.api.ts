import {
    ApiClientError,
    assertOpenApiOk,
    type SchemaMemberConfirmEmailResponseDto,
    type SchemaMemberMeResponseDto,
    type SchemaPasswordResetResponseDto,
    type SchemaRegisterMemberResponseDto,
} from "@workspace/api-client/core";

import { $cabinetApi } from "@/modules/shared/api";

export type CabinetLocale = "ru" | "en" | "es";

/**
 * Аккаунт участника по сессии. Нет сессии (401) — `null`, а не ошибка: кабинет сам решает,
 * что показать вместо страницы.
 */
export async function getCabinetMe(): Promise<SchemaMemberMeResponseDto | null> {
    try {
        const response = await $cabinetApi.GET("/cabinet/auth/me");
        if (response.response.status === 401) {
            return null;
        }
        return await assertOpenApiOk<SchemaMemberMeResponseDto>(response);
    } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
            return null;
        }
        throw error;
    }
}

/** Токены приходят в HttpOnly-куках, тело ответа их не содержит. */
export async function loginMember(body: { email: string; password: string }): Promise<void> {
    const response = await $cabinetApi.POST("/cabinet/auth/login", { body });
    await assertOpenApiOk(response);
}

export async function logoutMember(): Promise<void> {
    // Refresh-токен бэкенд читает из куки, тело не нужно
    const response = await $cabinetApi.POST("/cabinet/auth/logout");
    await assertOpenApiOk(response);
}

/** Аккаунт без клуба: клуб появляется позже, по ссылке или приглашению. */
export async function registerMember(body: {
    email: string;
    password: string;
}): Promise<SchemaRegisterMemberResponseDto> {
    const response = await $cabinetApi.POST("/cabinet/auth/member/register", { body });
    return assertOpenApiOk<SchemaRegisterMemberResponseDto>(response);
}

export async function confirmMemberEmail(
    token: string
): Promise<SchemaMemberConfirmEmailResponseDto> {
    const response = await $cabinetApi.POST("/cabinet/auth/member/confirm-email", {
        body: { token },
    });
    return assertOpenApiOk<SchemaMemberConfirmEmailResponseDto>(response);
}

/** Ответ всегда один и тот же: существование адреса не раскрывается. */
export async function resendMemberConfirmation(body: {
    email: string;
    locale?: CabinetLocale;
}): Promise<void> {
    const response = await $cabinetApi.POST("/cabinet/auth/member/confirm-email/resend", { body });
    await assertOpenApiOk(response);
}

export async function requestMemberPasswordReset(body: {
    email: string;
    locale?: CabinetLocale;
}): Promise<SchemaPasswordResetResponseDto> {
    const response = await $cabinetApi.POST("/cabinet/auth/password/reset", { body });
    return assertOpenApiOk<SchemaPasswordResetResponseDto>(response);
}

export async function confirmMemberPasswordReset(body: {
    token: string;
    newPassword: string;
}): Promise<SchemaPasswordResetResponseDto> {
    const response = await $cabinetApi.POST("/cabinet/auth/password/reset/confirm", { body });
    return assertOpenApiOk<SchemaPasswordResetResponseDto>(response);
}
