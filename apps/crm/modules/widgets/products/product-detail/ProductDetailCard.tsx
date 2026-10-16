"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowLeft, Edit2, Loader2, Save, X } from "lucide-react";

import type { SchemaUpdateProductDto } from "@workspace/api-client/core";
import { Button, Card, FieldInput, FieldSelect } from "@workspace/ui";

import { useCategories } from "@/modules/entities/category";
import { useMeasurementUnits } from "@/modules/entities/measurement-unit";
import { useProductDetail, useUpdateProduct } from "@/modules/entities/product";
import { AudiencePicker } from "@/modules/features/products";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { ProductInfo } from "./product-info";

interface ProductDetailCardProps {
    productId: string;
}

export function ProductDetailCard({ productId }: ProductDetailCardProps) {
    const t = useTranslations("crm.products.detail");
    const toAppPath = useLocalizedLink();
    const productsPath = toAppPath(ROUTES.CRM_PRODUCTS);
    const { data: product, isLoading, error } = useProductDetail(productId);
    const updateMutation = useUpdateProduct();
    const { data: categories } = useCategories();
    const { data: units } = useMeasurementUnits();

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<SchemaUpdateProductDto>({});

    const startEditing = useCallback(() => {
        if (!product) return;
        setForm({
            name: product.name,
            description: product.description ?? undefined,
            sku: product.sku ?? undefined,
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
        });
        setIsEditing(true);
    }, [product]);

    const handleSave = useCallback(async () => {
        try {
            await updateMutation.mutateAsync({
                id: productId,
                data: form,
            });
            setIsEditing(false);
        } catch {
            // Ошибка обрабатывается в mutation state
        }
    }, [updateMutation, productId, form]);

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
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={productsPath}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
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
                        <Button variant="outline" size="sm" onClick={startEditing}>
                            <Edit2 className="mr-1 h-4 w-4" />
                            {t("edit")}
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <Card className="p-6">
                {isEditing ? (
                    <div className="space-y-4">
                        <FieldInput
                            label={t("name")}
                            value={form.name ?? ""}
                            onChange={(e) => handleChange("name", e.target.value)}
                            required
                        />
                        <FieldInput
                            label={t("description")}
                            value={form.description ?? ""}
                            onChange={(e) => handleChange("description", e.target.value)}
                        />
                        <FieldInput
                            label={t("sku")}
                            value={form.sku ?? ""}
                            onChange={(e) => handleChange("sku", e.target.value)}
                        />

                        <FieldSelect
                            label={t("category")}
                            placeholder={t("selectCategory")}
                            options={(categories ?? []).map((cat) => ({
                                value: cat.id,
                                label: cat.name,
                            }))}
                            value={form.categoryId ?? ""}
                            onValueChange={(value) => handleChange("categoryId", value)}
                        />

                        <FieldSelect
                            label={t("measurementUnit")}
                            placeholder={t("selectUnit")}
                            options={(units ?? []).map((u) => ({
                                value: u.id,
                                label: `${u.name} (${u.code})`,
                            }))}
                            value={form.measurementUnitId ?? ""}
                            onValueChange={(value) => handleChange("measurementUnitId", value)}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FieldInput
                                label={t("price")}
                                type="number"
                                value={String(form.price ?? 0)}
                                onChange={(e) => handleChange("price", Number(e.target.value))}
                            />
                            <FieldInput
                                label={t("currentQuantity")}
                                type="number"
                                value={String(form.currentQuantity ?? 0)}
                                onChange={(e) =>
                                    handleChange("currentQuantity", Number(e.target.value))
                                }
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FieldInput
                                label={t("thc")}
                                type="number"
                                value={String(form.thc ?? "")}
                                onChange={(e) =>
                                    handleChange("thc", e.target.value ? Number(e.target.value) : 0)
                                }
                            />
                            <FieldInput
                                label={t("cbd")}
                                type="number"
                                value={String(form.cbd ?? "")}
                                onChange={(e) =>
                                    handleChange("cbd", e.target.value ? Number(e.target.value) : 0)
                                }
                            />
                            <FieldInput
                                label={t("strain")}
                                value={form.strain ?? ""}
                                onChange={(e) => handleChange("strain", e.target.value)}
                            />
                        </div>

                        <AudiencePicker
                            value={form.audiences ?? []}
                            onChange={(audiences) => setForm((prev) => ({ ...prev, audiences }))}
                        />

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.isActive ?? true}
                                    onChange={(e) => handleChange("isActive", e.target.checked)}
                                />
                                {t("isActive")}
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.isAvailable ?? true}
                                    onChange={(e) => handleChange("isAvailable", e.target.checked)}
                                />
                                {t("isAvailable")}
                            </label>
                        </div>

                        {updateMutation.isError && (
                            <p className="text-sm text-destructive">{t("saveError")}</p>
                        )}
                    </div>
                ) : (
                    <ProductInfo product={product} />
                )}
            </Card>
        </div>
    );
}
