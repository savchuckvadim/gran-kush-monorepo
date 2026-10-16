"use client";

import { useTranslations } from "next-intl";

import { X } from "lucide-react";

import type { SchemaCabinetProductDto } from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

import { useMoneyFormat } from "@/modules/shared/lib/use-money-format";

import type { CartLine } from "../model/cart-store";

import { QuantityStepper } from "./quantity-stepper";

interface CartLineRowProps {
    line: CartLine;
    /** Нет — товар убрали с витрины после того, как он попал в корзину */
    product: SchemaCabinetProductDto | undefined;
    onQuantityChange: (quantity: number) => void;
}

/** Позиция корзины; закончившийся или снятый товар остаётся видимым, но в заказ не идёт. */
export function CartLineRow({ line, product, onQuantityChange }: CartLineRowProps) {
    const t = useTranslations("cabinet.shop.cart");
    const money = useMoneyFormat();
    const available = product?.inStock === true;

    return (
        <li className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{product?.name ?? t("unavailableProduct")}</p>
                {available && product ? (
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {money(product.price * line.quantity)}
                    </p>
                ) : (
                    <p className="text-sm text-destructive">{t("outOfStock")}</p>
                )}
                {available && (
                    <div className="mt-2">
                        <QuantityStepper
                            value={line.quantity}
                            unit={product?.unit?.code}
                            onChange={onQuantityChange}
                            decreaseLabel={t("decrease")}
                            increaseLabel={t("increase")}
                        />
                    </div>
                )}
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={t("remove")}
                onClick={() => onQuantityChange(0)}
            >
                <X aria-hidden="true" />
            </Button>
        </li>
    );
}
