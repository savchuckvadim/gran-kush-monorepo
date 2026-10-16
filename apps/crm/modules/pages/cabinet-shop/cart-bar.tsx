"use client";

import { useTranslations } from "next-intl";

import { ShoppingBag } from "lucide-react";

import { Button } from "@workspace/ui";

/**
 * Полоса корзины внизу экрана на телефоне: корзина там под витриной, и до неё далеко листать.
 * На широком экране корзина видна сбоку, полоса не нужна.
 */
export function CartBar({ count }: { count: number }) {
    const t = useTranslations("cabinet.shop.cart");
    if (count === 0) return null;
    return (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
            <Button
                className="w-full"
                onClick={() =>
                    document.getElementById("cart")?.scrollIntoView({ behavior: "smooth" })
                }
            >
                <ShoppingBag aria-hidden="true" />
                {t("open", { count })}
            </Button>
        </div>
    );
}
