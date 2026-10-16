"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Loader2, Search } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Input } from "@workspace/ui";

import { useShopAccess, useShopCategories, useShopProducts } from "@/modules/entities/cabinet-shop";
import { CartPanel, useCart } from "@/modules/features/cabinet-cart";

import { CartBar } from "./cart-bar";
import { CategoryChips } from "./category-chips";
import { ProductCard } from "./product-card";
import { ShopClosed } from "./shop-closed";

/**
 * Витрина клуба в кабинете: категории, поиск, карточки и корзина. Что открыто, решает сервер по
 * правилам клуба (`GET /cabinet/club/shop-access`); закрытую витрину страница объясняет и
 * каталог не запрашивает.
 */
export function CabinetShopPage({ slug }: { slug: string }) {
    const t = useTranslations("cabinet.shop");
    const access = useShopAccess(slug);
    const canBrowse = access.data?.canBrowse === true;
    const products = useShopProducts(slug, canBrowse);
    const categories = useShopCategories(slug, canBrowse);
    const cart = useCart(slug);
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return (products.data ?? []).filter(
            (product) =>
                (!categoryId || product.category?.id === categoryId) &&
                (!needle ||
                    product.name.toLowerCase().includes(needle) ||
                    product.strain?.toLowerCase().includes(needle))
        );
    }, [products.data, categoryId, query]);

    if (access.isLoading || (canBrowse && products.isLoading)) {
        return (
            <div className="flex flex-1 items-center justify-center py-10">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }

    const loadError = access.error ?? products.error;
    if (loadError) {
        return (
            <p role="alert" className="text-sm text-destructive">
                {getApiErrorMessage(loadError)}
            </p>
        );
    }

    if (!access.data || !canBrowse) {
        return <ShopClosed />;
    }

    return (
        <div className="grid gap-6 pb-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-0">
            <section className="min-w-0 space-y-4" aria-label={t("title")}>
                <div className="relative">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <Input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t("search")}
                        aria-label={t("search")}
                        className="pl-9"
                    />
                </div>
                {(categories.data?.length ?? 0) > 1 && (
                    <CategoryChips
                        categories={categories.data ?? []}
                        selected={categoryId}
                        onSelect={setCategoryId}
                        allLabel={t("allCategories")}
                    />
                )}

                {visible.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        {(products.data?.length ?? 0) === 0 ? t("empty") : t("nothingFound")}
                    </p>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {visible.map((product) => (
                            <li key={product.id}>
                                <ProductCard
                                    product={product}
                                    quantity={cart.quantityOf(product.id)}
                                    onQuantityChange={(quantity) =>
                                        cart.setQuantity(product.id, quantity)
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <aside className="lg:sticky lg:top-20 lg:self-start">
                <CartPanel slug={slug} products={products.data ?? []} access={access.data} />
            </aside>

            <CartBar count={cart.lines.length} />
        </div>
    );
}
