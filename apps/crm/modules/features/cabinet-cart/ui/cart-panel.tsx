"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Loader2, ShoppingBag } from "lucide-react";

import {
    newIdempotencyKey,
    type SchemaCabinetProductDto,
    type SchemaShopAccessDto,
} from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { usePlaceMyOrder } from "@/modules/entities/cabinet-order";
import { useMyMonthlyLimit } from "@/modules/entities/cabinet-shop";
import { useCabinetLinks } from "@/modules/processes/member-auth";
import { useMoneyFormat } from "@/modules/shared/lib/use-money-format";

import { usePlaceOrderErrorText } from "../lib/use-place-order-error";
import { useCart } from "../model/use-cart";

import { CartLimitNote } from "./cart-limit-note";
import { CartLineRow } from "./cart-line-row";

interface CartPanelProps {
    slug: string;
    products: readonly SchemaCabinetProductDto[];
    access: SchemaShopAccessDto;
}

const NOTES_MAX = 1000;

/**
 * Корзина и оформление. Сумма и граммы лимита — по данным витрины для подсказки; окончательно
 * их считает сервер в транзакции заказа.
 * Ключ идемпотентности живёт до успешного заказа: повторное «Оформить» после обрыва связи
 * не создаёт второй заказ.
 */
export function CartPanel({ slug, products, access }: CartPanelProps) {
    const t = useTranslations("cabinet.shop.cart");
    const tDenial = useTranslations("cabinet.shop.denial");
    const placeErrorText = usePlaceOrderErrorText();
    const money = useMoneyFormat();
    const router = useRouter();
    const links = useCabinetLinks();
    const cart = useCart(slug);
    const place = usePlaceMyOrder(slug);
    const limit = useMyMonthlyLimit(slug, cart.lines.length > 0);
    const [notes, setNotes] = useState("");
    const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

    const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
    const rows = cart.lines.map((line) => ({ line, product: byId.get(line.productId) }));
    const orderable = rows.filter((row) => row.product?.inStock);
    const total = orderable.reduce(
        (sum, row) => sum + (row.product?.price ?? 0) * row.line.quantity,
        0
    );
    const cartGrams =
        Math.round(
            orderable.reduce(
                (sum, row) => sum + (row.product?.limitGramsPerUnit ?? 0) * row.line.quantity,
                0
            ) * 1000
        ) / 1000;
    const remainingGrams = limit.data?.enabled ? limit.data.remainingGrams : null;
    const overLimit = remainingGrams !== null && cartGrams > remainingGrams;

    const [denial] = access.reasons;
    const placeError = placeErrorText(place.error);

    const submit = () =>
        place.mutate(
            {
                body: {
                    items: orderable.map(({ line }) => ({
                        productId: line.productId,
                        quantity: line.quantity,
                    })),
                    notes: notes.trim() || undefined,
                },
                idempotencyKey,
            },
            {
                onSuccess: (order) => {
                    cart.clear();
                    setNotes("");
                    setIdempotencyKey(newIdempotencyKey());
                    router.push(links.clubOrder(slug, order.id));
                },
            }
        );

    return (
        <Card id="cart" className="scroll-mt-20">
            <div className="space-y-4 px-4">
                <div className="flex items-center gap-2">
                    <ShoppingBag className="size-5" aria-hidden="true" />
                    <h2 className="text-lg font-medium">{t("title")}</h2>
                </div>

                {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("empty")}</p>
                ) : (
                    <ul className="divide-y">
                        {rows.map(({ line, product }) => (
                            <CartLineRow
                                key={line.productId}
                                line={line}
                                product={product}
                                onQuantityChange={(quantity) =>
                                    cart.setQuantity(line.productId, quantity)
                                }
                            />
                        ))}
                    </ul>
                )}

                {orderable.length > 0 && (
                    <>
                        <label className="block space-y-1 text-sm">
                            <span className="text-muted-foreground">{t("notes")}</span>
                            <textarea
                                value={notes}
                                maxLength={NOTES_MAX}
                                rows={2}
                                onChange={(event) => setNotes(event.target.value)}
                                placeholder={t("notesPlaceholder")}
                                className="w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </label>

                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm text-muted-foreground">{t("total")}</span>
                            <span className="text-lg font-semibold tabular-nums">
                                {money(total)}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{t("totalHint")}</p>
                        {remainingGrams !== null && (
                            <CartLimitNote cartGrams={cartGrams} remainingGrams={remainingGrams} />
                        )}
                    </>
                )}

                {denial && orderable.length > 0 && (
                    <p className="text-sm text-muted-foreground">{tDenial(denial)}</p>
                )}
                {placeError && (
                    <p role="alert" className="text-sm text-destructive">
                        {placeError}
                    </p>
                )}

                <Button
                    className="w-full"
                    disabled={
                        !access.canOrder || orderable.length === 0 || overLimit || place.isPending
                    }
                    onClick={submit}
                >
                    {place.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                    {t("place")}
                </Button>
            </div>
        </Card>
    );
}
