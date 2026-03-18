"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ChevronLeft, ChevronRight, Edit2, Loader2, Package, Trash2 } from "lucide-react";

import type { SchemaProductListDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { useDeleteProduct,useProducts } from "@/modules/entities/product";

interface ProductRowProps {
    product: SchemaProductListDto;
    locale: string;
}

function ProductRow({ product, locale }: ProductRowProps) {
    const t = useTranslations("crm.products.list");
    const deleteMutation = useDeleteProduct();

    const handleDelete = () => {
        if (window.confirm(t("confirmDelete"))) {
            deleteMutation.mutate(product.id);
        }
    };

    return (
        <tr className="border-b text-sm last:border-b-0">
            <td className="px-3 py-2">
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
            </td>
            <td className="px-3 py-2">{product.category?.name ?? "—"}</td>
            <td className="px-3 py-2 text-right font-mono">€{product.price}</td>
            <td className="px-3 py-2 text-right">
                {product.currentQuantity} {product.measurementUnit?.code ?? ""}
            </td>
            <td className="px-3 py-2">
                {product.isActive ? (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-700">
                        {t("active")}
                    </span>
                ) : (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-700">
                        {t("inactive")}
                    </span>
                )}
            </td>
            <td className="px-3 py-2">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${locale}/crm/products/${product.id}`}>
                            <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                </div>
            </td>
        </tr>
    );
}

interface ProductsTableProps {
    locale: string;
}

export function ProductsTable({ locale }: ProductsTableProps) {
    const t = useTranslations("crm.products.list");
    const [page, setPage] = useState(1);
    const { data, isLoading, error } = useProducts({ page, limit: 20 });

    const products = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    return (
        <Card className="p-4">
            {isLoading && (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("loading")}</span>
                </div>
            )}

            {error && <p className="py-4 text-sm text-destructive">{t("error")}</p>}

            {!isLoading && !error && products.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
            )}

            {products.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b text-xs text-muted-foreground">
                                    <th className="px-3 py-2 font-medium">{t("colProduct")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colCategory")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colPrice")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colStock")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colStatus")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colActions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <ProductRow
                                        key={product.id}
                                        product={product}
                                        locale={locale}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {t("page")} {page} / {totalPages}
                            </span>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}
