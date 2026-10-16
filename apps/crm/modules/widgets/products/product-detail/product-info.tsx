"use client";

import { useTranslations } from "next-intl";

import type { SchemaProductDetailDto } from "@workspace/api-client/core";

import { InfoRow } from "./info-row";

/** Карточка товара в режиме просмотра: склад, цена, состав и кому товар виден в кабинете. */
export function ProductInfo({ product }: { product: SchemaProductDetailDto }) {
    const t = useTranslations("crm.products.detail");
    const tAudience = useTranslations("crm.products.audiences");
    const audiences =
        product.audiences.length > 0
            ? product.audiences.map((audience) => tAudience(audience)).join(", ")
            : tAudience("all");

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label={t("category")} value={product.category?.name ?? "—"} />
                <InfoRow
                    label={t("measurementUnit")}
                    value={product.measurementUnit?.name ?? "—"}
                />
                <InfoRow label={t("price")} value={`€${product.price}`} />
                <InfoRow
                    label={t("stock")}
                    value={`${product.currentQuantity} / ${product.initialQuantity} ${product.measurementUnit?.code ?? ""}`}
                />
                <InfoRow label={t("sku")} value={product.sku ?? "—"} />
                <InfoRow
                    label={t("status")}
                    value={product.isActive ? t("active") : t("inactive")}
                />
                {product.thc != null && <InfoRow label={t("thc")} value={`${product.thc}%`} />}
                {product.cbd != null && <InfoRow label={t("cbd")} value={`${product.cbd}%`} />}
                {product.strain && <InfoRow label={t("strain")} value={product.strain} />}
                <InfoRow label={tAudience("label")} value={audiences} />
                <InfoRow
                    label={t("limitGramsPerUnit")}
                    value={
                        product.limitGramsPerUnit == null
                            ? t("notInLimit")
                            : `${product.limitGramsPerUnit} g`
                    }
                />
            </div>

            {product.description && (
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{t("description")}</p>
                    <p className="text-sm">{product.description}</p>
                </div>
            )}
        </div>
    );
}
