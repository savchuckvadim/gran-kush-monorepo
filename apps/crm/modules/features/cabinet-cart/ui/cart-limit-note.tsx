"use client";

import { useTranslations } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";

interface CartLimitNoteProps {
    /** Сколько граммов лимита займёт корзина */
    cartGrams: number;
    /** Сколько осталось за последние 30 дней */
    remainingGrams: number;
}

/** Лимит участника рядом с итогом: сколько войдёт в лимит и сколько осталось. */
export function CartLimitNote({ cartGrams, remainingGrams }: CartLimitNoteProps) {
    const t = useTranslations("cabinet.shop.cart.limit");
    const over = cartGrams > remainingGrams;
    return (
        <p
            role={over ? "alert" : undefined}
            className={cn("text-xs", over ? "text-destructive" : "text-muted-foreground")}
        >
            {t("summary", { cart: cartGrams, remaining: remainingGrams })}
            {over && ` ${t("over")}`}
        </p>
    );
}
