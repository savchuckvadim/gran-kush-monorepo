import { useQuery } from "@tanstack/react-query";

import { cabinetKeys } from "@/modules/entities/cabinet-account";

import {
    getMyMonthlyLimit,
    getShopAccess,
    getShopCategories,
    getShopProducts,
} from "../api/cabinet-shop.api";

/** Всё о витрине клуба; с `part` — один её запрос. */
export const cabinetShopKey = (slug: string, part?: string) =>
    part
        ? ([...cabinetKeys.club(slug), "shop", part] as const)
        : ([...cabinetKeys.club(slug), "shop"] as const);

/**
 * Доступ меняет открытый визит на стойке: его приносят события `presence.*` (realtime,
 * `cabinet-shop/realtime.ts`), без связи — запасной таймер RealtimeProvider.
 */
export function useShopAccess(slug: string) {
    return useQuery({
        queryKey: cabinetShopKey(slug, "access"),
        queryFn: getShopAccess,
        retry: false,
    });
}

/** Лимит меняется с каждым заказом: после оформления его сбрасывает инвалидация клуба. */
export function useMyMonthlyLimit(slug: string, enabled: boolean) {
    return useQuery({
        queryKey: cabinetShopKey(slug, "monthly-limit"),
        queryFn: getMyMonthlyLimit,
        enabled,
        retry: false,
    });
}

export function useShopProducts(slug: string, enabled: boolean) {
    return useQuery({
        queryKey: cabinetShopKey(slug, "products"),
        queryFn: getShopProducts,
        enabled,
        staleTime: 30_000,
        retry: false,
    });
}

export function useShopCategories(slug: string, enabled: boolean) {
    return useQuery({
        queryKey: cabinetShopKey(slug, "categories"),
        queryFn: getShopCategories,
        enabled,
        staleTime: 5 * 60_000,
        retry: false,
    });
}
