"use client";

import { useTranslations } from "next-intl";

import { Package, Plus } from "lucide-react";

import type { SchemaCabinetProductDto } from "@workspace/api-client/core";
import { Badge, Button, Card } from "@workspace/ui";

import { QuantityStepper } from "@/modules/features/cabinet-cart";
import { useMoneyFormat } from "@/modules/shared/lib/use-money-format";

interface ProductCardProps {
    product: SchemaCabinetProductDto;
    quantity: number;
    onQuantityChange: (quantity: number) => void;
}

/** Товар витрины: фото, состав, цена за единицу и количество в корзине. */
export function ProductCard({ product, quantity, onQuantityChange }: ProductCardProps) {
    const t = useTranslations("cabinet.shop");
    const money = useMoneyFormat();
    const unit = product.unit?.code;
    const facts = [
        product.strain,
        product.thc != null ? t("thc", { value: product.thc }) : null,
        product.cbd != null ? t("cbd", { value: product.cbd }) : null,
    ].filter((fact): fact is string => Boolean(fact));

    return (
        <Card padding="sm" className="flex h-full flex-col gap-3 overflow-hidden p-0">
            {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- адрес фото задаёт клуб, хост любой; next/image требует список хостов
                <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="flex h-24 w-full items-center justify-center bg-muted">
                    <Package className="size-10 text-muted-foreground" aria-hidden="true" />
                </div>
            )}

            <div className="flex flex-1 flex-col gap-2 px-4 pb-4">
                <div className="space-y-1">
                    {product.category && (
                        <p className="text-xs text-muted-foreground">{product.category.name}</p>
                    )}
                    <h3 className="font-medium leading-tight">{product.name}</h3>
                    {facts.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {facts.map((fact) => (
                                <Badge key={fact} variant="outline">
                                    {fact}
                                </Badge>
                            ))}
                        </div>
                    )}
                    {product.description && (
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                            {product.description}
                        </p>
                    )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <span className="font-semibold tabular-nums">
                        {money(product.price)}
                        {unit && (
                            <span className="text-sm font-normal text-muted-foreground">
                                {" "}
                                / {unit}
                            </span>
                        )}
                    </span>
                    {!product.inStock ? (
                        <Badge variant="secondary">{t("outOfStock")}</Badge>
                    ) : quantity > 0 ? (
                        <QuantityStepper
                            value={quantity}
                            unit={unit}
                            onChange={onQuantityChange}
                            decreaseLabel={t("cart.decrease")}
                            increaseLabel={t("cart.increase")}
                        />
                    ) : (
                        <Button size="sm" onClick={() => onQuantityChange(1)}>
                            <Plus aria-hidden="true" />
                            {t("addToCart")}
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
