import {
    assertOpenApiOk,
    type SchemaAccountProfileDto,
    type SchemaSaveAccountProfileDto,
} from "@workspace/api-client/core";

import { $cabinetApi } from "@/modules/shared/api";

/** Профиль аккаунта: ФИО, дата рождения, телефон, адрес — для анкет новых клубов. */
export async function getAccountProfile(): Promise<SchemaAccountProfileDto> {
    const response = await $cabinetApi.GET("/cabinet/account/profile");
    return assertOpenApiOk<SchemaAccountProfileDto>(response);
}

/** Сохраняется целиком; пустое поле — «не указано». Анкеты клубов не меняются. */
export async function saveAccountProfile(
    body: SchemaSaveAccountProfileDto
): Promise<SchemaAccountProfileDto> {
    const response = await $cabinetApi.PUT("/cabinet/account/profile", { body });
    return assertOpenApiOk<SchemaAccountProfileDto>(response);
}
