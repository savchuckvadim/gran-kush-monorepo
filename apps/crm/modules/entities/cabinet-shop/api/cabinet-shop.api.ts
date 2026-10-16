import {
    assertOpenApiOk,
    type SchemaCabinetProductCategoryDto,
    type SchemaCabinetProductDto,
    type SchemaShopAccessDto,
} from "@workspace/api-client/core";

import { $cabinetApi } from "@/modules/shared/api";

/*
 * Витрина клуба из адреса (`/{язык}/{клуб}/…`): клиент шлёт slug заголовком X-Portal-Slug,
 * поэтому функции его не принимают.
 */

/** Открыты ли каталог и заказ и почему нет — чтобы объяснить участнику, а не показать пустоту. */
export async function getShopAccess(): Promise<SchemaShopAccessDto> {
    const response = await $cabinetApi.GET("/cabinet/club/shop-access");
    return assertOpenApiOk<SchemaShopAccessDto>(response);
}

export async function getShopProducts(): Promise<SchemaCabinetProductDto[]> {
    const response = await $cabinetApi.GET("/cabinet/catalog/products");
    return assertOpenApiOk<SchemaCabinetProductDto[]>(response);
}

export async function getShopCategories(): Promise<SchemaCabinetProductCategoryDto[]> {
    const response = await $cabinetApi.GET("/cabinet/catalog/categories");
    return assertOpenApiOk<SchemaCabinetProductCategoryDto[]>(response);
}
