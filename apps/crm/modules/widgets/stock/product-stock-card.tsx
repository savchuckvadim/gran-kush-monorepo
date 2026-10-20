"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { PackageMinus, PackagePlus } from "lucide-react";

import { Button, Card } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import type { ProductChoice } from "@/modules/entities/product";
import { useStockState } from "@/modules/entities/stock";
import { PurchaseDialog, StockMoveDialog } from "@/modules/features/stock-moves";
import { useMoneyFormat } from "@/modules/shared";
import { CardHeading } from "@/modules/shared/ui";
import { Fact, FactGroup } from "@/modules/shared/ui/Fact";

import { StockMovesTable } from "./stock-moves-table";

/** Склад в карточке товара: остаток, средняя себестоимость, стоимость остатка, журнал, действия. */
export function ProductStockCard({ product }: { product: ProductChoice }) {
    const t = useTranslations("crm.stock.product");
    const money = useMoneyFormat();
    const { can } = usePermissions();
    const state = useStockState(product.id);
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [moveOpen, setMoveOpen] = useState(false);
    const unit = product.unitCode;
    const current = state.data
        ? { ...product, currentQuantity: state.data.currentQuantity }
        : product;

    return (
        <div className="space-y-4">
            <Card contentClassName="space-y-4 px-0">
                <CardHeading
                    title={t("title")}
                    hint={t("hint")}
                    actions={
                        can("catalog.manage") && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPurchaseOpen(true)}
                                >
                                    <PackagePlus aria-hidden="true" />
                                    {t("purchase")}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setMoveOpen(true)}>
                                    <PackageMinus aria-hidden="true" />
                                    {t("move")}
                                </Button>
                            </>
                        )
                    }
                />
                {state.data && (
                    <FactGroup title={t("figures")}>
                        <Fact
                            label={t("quantity")}
                            value={`${state.data.currentQuantity} ${unit}`}
                        />
                        <Fact
                            label={t("averageCost")}
                            value={
                                state.data.averageCost === null
                                    ? null
                                    : `${money(state.data.averageCost)} / ${unit}`
                            }
                        />
                        <Fact
                            label={t("stockValue")}
                            value={
                                state.data.stockValue === null ? null : money(state.data.stockValue)
                            }
                        />
                    </FactGroup>
                )}
            </Card>
            <StockMovesTable productId={product.id} />
            <PurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} product={current} />
            <StockMoveDialog open={moveOpen} onOpenChange={setMoveOpen} product={current} />
        </div>
    );
}
