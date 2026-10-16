import { useQuery } from "@tanstack/react-query";

import { cabinetKeys } from "@/modules/entities/cabinet-account";

import { getShopAccess, getShopCategories, getShopProducts } from "../api/cabinet-shop.api";

const shopKey = (slug: string, part: string) => [...cabinetKeys.club(slug), "shop", part] as const;

/** Открытый визит меняет доступ на стойке, а не здесь: перепроверяем, пока страница открыта. */
export function useShopAccess(slug: string) {
    return useQuery({
        queryKey: shopKey(slug, "access"),
        queryFn: getShopAccess,
        refetchInterval: 30_000,
        retry: false,
    });
}

export function useShopProducts(slug: string, enabled: boolean) {
    return useQuery({
        queryKey: shopKey(slug, "products"),
        queryFn: getShopProducts,
        enabled,
        staleTime: 30_000,
        retry: false,
    });
}

export function useShopCategories(slug: string, enabled: boolean) {
    return useQuery({
        queryKey: shopKey(slug, "categories"),
        queryFn: getShopCategories,
        enabled,
        staleTime: 5 * 60_000,
        retry: false,
    });
}
