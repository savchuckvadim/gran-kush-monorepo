"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Package, PackageMinus, ShoppingBasket } from "lucide-react";

import { Badge, Button } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import type { ScannedProduct } from "@/modules/entities/scan";
import { StockMoveDialog } from "@/modules/features/stock-moves";
import { useMoneyFormat } from "@/modules/shared";
import { type EntityRef, newOrderRef, useOpenEntity } from "@/modules/shared/lib/entity-slider";
import { scannerStore } from "@/modules/shared/lib/scan";

/**
 * Товар по этикетке или штрихкоду, когда черновика заказа нет: новый заказ с ним, списание
 * (у расходника — главное действие: его не продают) и карточка товара.
 */
export function ProductScanCard({
    product,
    onBack,
}: {
    product: ScannedProduct;
    onBack: () => void;
}) {
    const t = useTranslations("crm.scanner");
    const money = useMoneyFormat();
    const { can } = usePermissions();
    const openEntity = useOpenEntity();
    const [writeOff, setWriteOff] = useState(false);
    const unit = product.measurementUnit?.code ?? "";
    const sellable =
        !product.isConsumable &&
        product.isActive &&
        product.isAvailable &&
        product.currentQuantity > 0;

    const open = (ref: EntityRef) => {
        scannerStore.close();
        openEntity(ref);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <p className="text-lg font-semibold">{product.name}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                    {[
                        money(product.price),
                        t("stock", { quantity: product.currentQuantity, unit }),
                        product.code,
                    ].join(" · ")}
                </p>
                {product.isConsumable && <Badge variant="secondary">{t("consumable")}</Badge>}
                {!product.isConsumable && !sellable && (
                    <p className="text-sm text-destructive">{t("notForSale")}</p>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {can("catalog.manage") && (
                    <Button
                        variant={product.isConsumable ? "default" : "outline"}
                        onClick={() => setWriteOff(true)}
                    >
                        <PackageMinus aria-hidden="true" />
                        {t("actions.writeOff")}
                    </Button>
                )}
                {can("orders.create") && sellable && (
                    <Button onClick={() => open(newOrderRef({ productId: product.id }))}>
                        <ShoppingBasket aria-hidden="true" />
                        {t("actions.newOrder")}
                    </Button>
                )}
                <Button variant="outline" onClick={() => open({ kind: "product", id: product.id })}>
                    <Package aria-hidden="true" />
                    {t("actions.openProduct")}
                </Button>
                <Button variant="ghost" onClick={onBack}>
                    {t("scanAnother")}
                </Button>
            </div>
            <StockMoveDialog
                open={writeOff}
                onOpenChange={setWriteOff}
                product={{
                    id: product.id,
                    name: product.name,
                    currentQuantity: product.currentQuantity,
                    unitCode: unit,
                }}
            />
        </div>
    );
}
