"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowLeft, Edit2, Loader2, Save, X } from "lucide-react";

import type { SchemaUpdateProductDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { useProductDetail, useUpdateProduct } from "@/modules/entities/product";
import { ProductLabelsButton } from "@/modules/features/product-labels";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { ProductStockCard } from "@/modules/widgets/stock";

import { ProductEditFields } from "./product-edit-fields";
import { ProductInfo } from "./product-info";

interface ProductDetailCardProps {
    productId: string;
    /** In a slider the back arrow is not needed: the panel closes itself */
    layout?: "page" | "slider";
}

export function ProductDetailCard({ productId, layout = "page" }: ProductDetailCardProps) {
    const t = useTranslations("crm.products.detail");
    const toAppPath = useLocalizedLink();
    const productsPath = toAppPath(ROUTES.CRM_PRODUCTS);
    const { data: product, isLoading, error } = useProductDetail(productId);
    const updateMutation = useUpdateProduct();

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<SchemaUpdateProductDto>({});

    const startEditing = useCallback(() => {
        if (!product) return;
        setForm({
            name: product.name,
            description: product.description ?? undefined,
            sku: product.sku ?? undefined,
            barcode: product.barcode,
            isConsumable: product.isConsumable,
            categoryId: product.category?.id,
            measurementUnitId: product.measurementUnit?.id,
            price: Number(product.price),
            currentQuantity: Number(product.currentQuantity),
            isActive: product.isActive,
            isAvailable: product.isAvailable,
            thc: product.thc ?? undefined,
            cbd: product.cbd ?? undefined,
            strain: product.strain ?? undefined,
            audiences: product.audiences,
            limitGramsPerUnit: product.limitGramsPerUnit,
            taxRateId: product.taxRateId,
            priceIncludesTax: product.priceIncludesTax,
        });
        setIsEditing(true);
    }, [product]);

    const handleSave = useCallback(async () => {
        // остаток меняется только движением склада с причиной: неизменённый остаток не шлём
        const { currentQuantity, stockNote, ...rest } = form;
        const stockChanged = currentQuantity !== Number(product?.currentQuantity ?? 0);
        try {
            await updateMutation.mutateAsync({
                id: productId,
                data: stockChanged ? { ...rest, currentQuantity, stockNote } : rest,
            });
            setIsEditing(false);
        } catch {
            // Ошибка обрабатывается в mutation state
        }
    }, [updateMutation, productId, form, product]);

    const handleChange = useCallback(
        (field: keyof SchemaUpdateProductDto, value: string | number | boolean) => {
            setForm((prev) => ({ ...prev, [field]: value }));
        },
        []
    );

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("loading")}</span>
                </div>
            </Card>
        );
    }

    if (error || !product) {
        return (
            <Card className="p-6">
                <p className="text-destructive">{t("error")}</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {layout === "page" && (
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={productsPath}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                    <h1 className="text-xl font-semibold">
                        {isEditing ? t("editTitle") : product.name}
                    </h1>
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                                <X className="mr-1 h-4 w-4" />
                                {t("cancel")}
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-1 h-4 w-4" />
                                )}
                                {t("save")}
                            </Button>
                        </>
                    ) : (
                        <>
                            <ProductLabelsButton productIds={[product.id]} />
                            <Button variant="outline" size="sm" onClick={startEditing}>
                                <Edit2 className="mr-1 h-4 w-4" />
                                {t("edit")}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <Card className="p-6">
                {isEditing ? (
                    <ProductEditFields
                        form={form}
                        onChange={handleChange}
                        onPatch={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                        currentQuantity={Number(product.currentQuantity)}
                        saveError={updateMutation.isError}
                    />
                ) : (
                    <ProductInfo product={product} />
                )}
            </Card>
            {!isEditing && (
                <ProductStockCard
                    product={{
                        id: product.id,
                        name: product.name,
                        currentQuantity: Number(product.currentQuantity),
                        unitCode: product.measurementUnit?.code ?? "",
                    }}
                />
            )}
        </div>
    );
}
