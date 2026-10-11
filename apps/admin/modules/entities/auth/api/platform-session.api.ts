import { assertOpenApiOk, type SchemaPlatformLoginDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

/** Вход платформенного админа: сервер админки сохраняет токен в HttpOnly-cookie. */
export const loginPlatformAdmin = async (body: SchemaPlatformLoginDto): Promise<void> => {
    await assertOpenApiOk(await $api.POST("/platform/auth/login", { body }));
};

export const logoutPlatformAdmin = async (): Promise<void> => {
    await fetch("/api/session", { method: "DELETE" });
};
