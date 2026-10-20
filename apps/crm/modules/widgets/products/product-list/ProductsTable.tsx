"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Edit2, Package, Trash2, X } from "lucide-react";

import type { SchemaProductListDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { useDeleteProduct, useProducts } from "@/modules/entities/product";
import { LABEL_LIMITS, ProductLabelsButton } from "@/modules/features/product-labels";
import { EntityList, type EntityListTableColumn } from "@/modules/shared";
import { useOpenEntity } from "@/modules/shared/lib/entity-slider";
import { EntityLink } from "@/modules/shared/ui/EntityLink";

/** Каталог: товары клуба; отмеченные галочкой печатаются листом QR-этикеток. */
export function ProductsTable() {
    const t = useTranslations("crm.products.list");
    const openEntity = useOpenEntity();
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
    const { data, isLoading, error } = useProducts({ page, limit: 20 });
    const deleteMutation = useDeleteProduct();

    const products = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    const openProduct = (id: string) => openEntity({ kind: "product", id });
    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else if (next.size < LABEL_LIMITS.products) next.add(id);
            return next;
        });

    const tableColumns = [
        {
            key: "select",
            header: <span className="sr-only">{t("colSelect")}</span>,
            headClassName: "w-8",
            cell: (product: SchemaProductListDto) => (
                <input
                    type="checkbox"
                    className="size-4"
                    checked={selected.has(product.id)}
                    aria-label={t("select", { name: product.name })}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => toggle(product.id)}
                />
            ),
        },
        {
            key: "product",
            header: t("colProduct"),
            cell: (product: SchemaProductListDto) => (
                <div className="flex items-center gap-3">
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-10 w-10 rounded-md object-cover"
                        />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                            <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}
                    <div>
                        <p className="font-medium">{product.name}</p>
                        {product.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: "category",
            header: t("colCategory"),
            cell: (product: SchemaProductListDto) => product.category?.name ?? "—",
        },
        {
            key: "price",
            header: t("colPrice"),
            headClassName: "text-right",
            cellClassName: "text-right font-mono",
            cell: (product: SchemaProductListDto) => `€${product.price}`,
        },
        {
            key: "stock",
            header: t("colStock"),
            headClassName: "text-right",
            cellClassName: "text-right",
            cell: (product: SchemaProductListDto) =>
                `${product.currentQuantity} ${product.measurementUnit?.code ?? ""}`,
        },
        {
            key: "status",
            header: t("colStatus"),
            cell: (product: SchemaProductListDto) =>
                product.isActive ? (
                    <span
                        data-slot="badge"
                        className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-700"
                    >
                        {t("active")}
                    </span>
                ) : (
                    <span
                        data-slot="badge"
                        className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-700"
                    >
                        {t("inactive")}
                    </span>
                ),
        },
    ] as EntityListTableColumn<SchemaProductListDto>[];

    const handleDelete = (productId: string) => {
        if (typeof window !== "undefined" && window.confirm(t("confirmDelete"))) {
            deleteMutation.mutate(productId);
        }
    };

    return (
        <Card className="space-y-3 p-4">
            {selected.size > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <ProductLabelsButton
                        productIds={[...selected]}
                        label={t("printLabels", { count: selected.size })}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                        <X aria-hidden="true" />
                        {t("clearSelection")}
                    </Button>
                </div>
            )}
            <EntityList<SchemaProductListDto>
                items={products}
                loading={isLoading}
                error={error ? t("error") : undefined}
                emptyState={
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
                }
                getRowKey={(p) => p.id}
                tableColumns={tableColumns}
                defaultViewMode="table"
                visibilityStorageKey="crm-products-list"
                viewModeStorageKey="crm-products-list"
                reserveFilterSpace={false}
                isRowClickable
                onRowClick={(p) => openProduct(p.id)}
                cardTitle={(p) => tableColumns[1]?.cell(p)}
                defaultVisibleCardFieldKeys={["category", "price", "stock", "status"]}
                isCardClickable
                onCardClick={(p) => openProduct(p.id)}
                renderRowActions={(product) => (
                    <>
                        <Button variant="ghost" size="sm" asChild>
                            <EntityLink kind="product" id={product.id}>
                                <Edit2 className="h-3.5 w-3.5" />
                            </EntityLink>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                    </>
                )}
                pagination={{
                    page,
                    totalPages,
                    onPageChange: setPage,
                }}
            />
        </Card>
    );
}
