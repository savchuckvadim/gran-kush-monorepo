"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Edit2, Package, Trash2 } from "lucide-react";

import type { SchemaProductListDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { useDeleteProduct, useProducts } from "@/modules/entities/product";
import { ROUTES } from "@/modules/shared/config/routes";
import { EntityList, type EntityListTableColumn } from "@/modules/shared";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

export function ProductsTable() {
    const t = useTranslations("crm.products.list");
    const router = useRouter();
    const toAppPath = useLocalizedLink();
    const [page, setPage] = useState(1);
    const { data, isLoading, error } = useProducts({ page, limit: 20 });
    const deleteMutation = useDeleteProduct();

    const products = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    const productPath = (id: string) =>
        toAppPath(`${ROUTES.CRM_PRODUCT_DETAILS}/${id}`);

    const tableColumns = [
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
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-700">
                        {t("active")}
                    </span>
                ) : (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-700">
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
        <Card className="p-4">
            <EntityList<SchemaProductListDto>
                items={products}
                loading={isLoading}
                error={error ? t("error") : undefined}
                emptyState={<p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>}
                getRowKey={(p) => p.id}
                tableColumns={tableColumns}
                defaultViewMode="table"
                visibilityStorageKey="crm-products-list"
                viewModeStorageKey="crm-products-list"
                reserveFilterSpace={false}
                isRowClickable
                onRowClick={(p) => router.push(productPath(p.id))}
                renderRowActions={(product) => (
                    <>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={productPath(product.id)}>
                                <Edit2 className="h-3.5 w-3.5" />
                            </Link>
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
