import {
    SchemaMemberConfirmEmailResponseDto,
    type SchemaPasswordResetResponseDto,
    type SchemaRegisterMemberResponseDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared/api";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    surname?: string;
    email: string;
    password: string;
    phone?: string;
    birthday?: string;
    documentType?: string;
    documentNumber?: string;
    documentFirst?: File | string;
    documentSecond?: File | string;
    signature?: string;
    isMedical?: boolean;
    isRecreation?: boolean;
    isMj?: boolean;
}

export interface PasswordResetRequest {
    email: string;
}

export interface PasswordResetConfirm {
    token: string;
    newPassword: string;
}

/**
 * Login member (токены приходят в HttpOnly cookies, тело содержит user + deviceId)
 */
export async function loginMember(data: LoginRequest) {
    const response = await $api.POST("/lk/auth/login", {
        body: data,
    });

    if (!response.response.ok || !response.data) {
        const err = (response as { error?: { message?: string } }).error;
        throw new Error(err?.message ?? "Login failed");
    }

    return response.data;
}

/**
 * Register new member
 */
export async function registerMember(
    data: RegisterRequest,
    force: boolean = false
): Promise<SchemaRegisterMemberResponseDto> {
    const response = await $api.POST("/lk/auth/member/register", {
        params: {
            query: {
                force: force ? "true" : "false",
            },
        },
        body: data,
    });

    if (!response.response.ok) {
        const err = (response as { error?: { message?: string } }).error;
        throw new Error(err?.message ?? "Registration failed");
    }

    return response.data as SchemaRegisterMemberResponseDto;
}

/**
 * Confirm email
 */
export async function confirmEmail(token: string): Promise<SchemaMemberConfirmEmailResponseDto> {
    const response = await $api.POST("/lk/auth/member/confirm-email", {
        body: { token },
    });

    if (!response.response.ok) {
        const err = (response as { error?: { message?: string } }).error;

        throw new Error(err?.message ?? "Email confirmation failed");
    }

    return response.data as SchemaMemberConfirmEmailResponseDto;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(
    data: PasswordResetRequest
): Promise<SchemaPasswordResetResponseDto> {
    const response = await $api.POST("/lk/auth/password/reset", {
        body: data,
    });

    if (!response.response.ok) {
        const err = (response as { error?: { message?: string } }).error;
        throw new Error(err?.message ?? "Password reset request failed");
    }

    return response.data as SchemaPasswordResetResponseDto;
}

/**
 * Confirm password reset
 */
export async function confirmPasswordReset(
    data: PasswordResetConfirm
): Promise<SchemaPasswordResetResponseDto> {
    const response = await $api.POST("/lk/auth/password/reset/confirm", {
        body: data,
    });

    if (!response.response.ok) {
        const err = (response as { error?: { message?: string } }).error;
        throw new Error(err?.message ?? "Password reset confirmation failed");
    }

    return response.data as SchemaPasswordResetResponseDto;
}

/**
 * Logout member
 */
export async function logoutMember(): Promise<void> {
    // Refresh-токен читается бэкендом из HttpOnly cookie, тело не нужно
    const response = await $api.POST("/lk/auth/logout");

    if (!response.response.ok) {
        const err = (response as { error?: { message?: string } }).error;
        throw new Error(err?.message ?? "Logout failed");
    }
}
