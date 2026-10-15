"use client";

import { useTranslations } from "next-intl";

import { Gift, Trash2 } from "lucide-react";

import { Button, FieldInput, Switch } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { useMoneyFormat } from "@/modules/shared";

import {
    type DraftLineError,
    linePrice,
    lineTotal,
    type OrderDraftLine,
} from "../model/order-draft";

interface OrderDraftLineRowProps {
    line: OrderDraftLine;
    error?: DraftLineError;
    disabled?: boolean;
    onChange: (patch: Partial<Pick<OrderDraftLine, "quantity" | "unitPrice" | "isGift">>) => void;
    onRemove: () => void;
}

/** One product of the new order: quantity, price, gift and what the line costs. */
export function OrderDraftLineRow({
    line,
    error,
    disabled,
    onChange,
    onRemove,
}: OrderDraftLineRowProps) {
    const t = useTranslations("crm.orders.create");
    const money = useMoneyFormat();
    const { product } = line;
    const unit = product.unitCode ?? "";
    const quantityError =
        error === "quantity"
            ? t("lineError.quantity")
            : error === "stock"
              ? t("lineError.stock", { quantity: product.currentQuantity, unit })
              : undefined;

    return (
        <li className={cn("space-y-3 rounded-lg border p-3", line.isGift && "border-primary/40")}>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {[product.sku, t("inStock", { quantity: product.currentQuantity, unit })]
                            .filter(Boolean)
                            .join(" · ")}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    aria-label={t("removeLine", { product: product.name })}
                    onClick={onRemove}
                >
                    <Trash2 aria-hidden="true" />
                </Button>
            </div>

            <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[8rem_9rem_1fr_auto]">
                <FieldInput
                    label={unit ? t("quantityIn", { unit }) : t("quantity")}
                    inputMode="decimal"
                    autoComplete="off"
                    value={line.quantity}
                    disabled={disabled}
                    error={quantityError}
                    onChange={(event) => onChange({ quantity: event.target.value })}
                />
                <FieldInput
                    label={t("unitPrice")}
                    inputMode="decimal"
                    autoComplete="off"
                    value={line.unitPrice}
                    disabled={disabled || line.isGift}
                    error={error === "price" ? t("lineError.price") : undefined}
                    helperText={
                        !line.isGift && linePrice(line) !== product.price
                            ? t("catalogPrice", { price: money(product.price) })
                            : undefined
                    }
                    onChange={(event) => onChange({ unitPrice: event.target.value })}
                />
                <label className="flex items-center gap-2 self-center text-sm sm:pt-6">
                    <Switch
                        checked={line.isGift}
                        disabled={disabled}
                        onCheckedChange={(isGift) => onChange({ isGift })}
                    />
                    <Gift className="size-4 text-muted-foreground" aria-hidden="true" />
                    {t("gift")}
                </label>
                <p className="self-center text-right font-mono tabular-nums sm:pt-6">
                    {line.isGift ? (
                        <span className="font-sans text-sm text-primary">{t("giftFree")}</span>
                    ) : (
                        money(lineTotal(line))
                    )}
                </p>
            </div>
        </li>
    );
}
