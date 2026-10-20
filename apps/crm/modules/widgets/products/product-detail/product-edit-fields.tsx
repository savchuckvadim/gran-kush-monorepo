"use client";

import { useTranslations } from "next-intl";

import type { SchemaUpdateProductDto } from "@workspace/api-client/core";
import { FieldInput, FieldSelect } from "@workspace/ui";

import { useCategories } from "@/modules/entities/category";
import { useMeasurementUnits } from "@/modules/entities/measurement-unit";
import { AudiencePicker, ProductTaxFields } from "@/modules/features/products";

interface ProductEditFieldsProps {
    form: SchemaUpdateProductDto;
    onChange: (field: keyof SchemaUpdateProductDto, value: string | number | boolean) => void;
    onPatch: (patch: Partial<SchemaUpdateProductDto>) => void;
    /** Остаток до правки: изменённый требует причину */
    currentQuantity: number;
    saveError: boolean;
}

/** Поля карточки товара в режиме правки: описание, склад, налог, состав, аудитории и расходник. */
export function ProductEditFields({
    form,
    onChange,
    onPatch,
    currentQuantity,
    saveError,
}: ProductEditFieldsProps) {
    const t = useTranslations("crm.products.detail");
    const categories = useCategories();
    const units = useMeasurementUnits();

    return (
        <div className="space-y-4">
            <FieldInput
                label={t("name")}
                value={form.name ?? ""}
                onChange={(e) => onChange("name", e.target.value)}
                required
            />
            <FieldInput
                label={t("description")}
                value={form.description ?? ""}
                onChange={(e) => onChange("description", e.target.value)}
            />
            <FieldInput
                label={t("sku")}
                value={form.sku ?? ""}
                onChange={(e) => onChange("sku", e.target.value)}
            />
            <FieldInput
                label={t("barcode")}
                helperText={t("barcodeHint")}
                value={form.barcode ?? ""}
                onChange={(e) => onPatch({ barcode: e.target.value || null })}
            />

            <FieldSelect
                label={t("category")}
                placeholder={t("selectCategory")}
                options={(categories.data ?? []).map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                }))}
                value={form.categoryId ?? ""}
                onValueChange={(value) => onChange("categoryId", value)}
            />

            <FieldSelect
                label={t("measurementUnit")}
                placeholder={t("selectUnit")}
                options={(units.data ?? []).map((u) => ({
                    value: u.id,
                    label: `${u.name} (${u.code})`,
                }))}
                value={form.measurementUnitId ?? ""}
                onValueChange={(value) => onChange("measurementUnitId", value)}
            />

            <div className="grid grid-cols-2 gap-4">
                <FieldInput
                    label={t("price")}
                    type="number"
                    value={String(form.price ?? 0)}
                    onChange={(e) => onChange("price", Number(e.target.value))}
                />
                <FieldInput
                    label={t("currentQuantity")}
                    type="number"
                    value={String(form.currentQuantity ?? 0)}
                    onChange={(e) => onChange("currentQuantity", Number(e.target.value))}
                />
            </div>
            {form.currentQuantity !== currentQuantity && (
                <FieldInput
                    label={t("stockNote")}
                    helperText={t("stockNoteHint")}
                    required
                    value={form.stockNote ?? ""}
                    onChange={(e) => onChange("stockNote", e.target.value)}
                />
            )}

            <ProductTaxFields
                value={{
                    taxRateId: form.taxRateId ?? null,
                    priceIncludesTax: form.priceIncludesTax ?? null,
                }}
                onChange={onPatch}
            />

            <div className="grid grid-cols-3 gap-4">
                <FieldInput
                    label={t("thc")}
                    type="number"
                    value={String(form.thc ?? "")}
                    onChange={(e) => onChange("thc", e.target.value ? Number(e.target.value) : 0)}
                />
                <FieldInput
                    label={t("cbd")}
                    type="number"
                    value={String(form.cbd ?? "")}
                    onChange={(e) => onChange("cbd", e.target.value ? Number(e.target.value) : 0)}
                />
                <FieldInput
                    label={t("strain")}
                    value={form.strain ?? ""}
                    onChange={(e) => onChange("strain", e.target.value)}
                />
            </div>

            <FieldInput
                label={t("limitGramsPerUnit")}
                type="number"
                value={form.limitGramsPerUnit == null ? "" : String(form.limitGramsPerUnit)}
                onChange={(e) =>
                    onPatch({ limitGramsPerUnit: e.target.value ? Number(e.target.value) : null })
                }
            />

            <AudiencePicker
                value={form.audiences ?? []}
                onChange={(audiences) => onPatch({ audiences })}
            />

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.isActive ?? true}
                        onChange={(e) => onChange("isActive", e.target.checked)}
                    />
                    {t("isActive")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.isAvailable ?? true}
                        onChange={(e) => onChange("isAvailable", e.target.checked)}
                    />
                    {t("isAvailable")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.isConsumable ?? false}
                        onChange={(e) => onChange("isConsumable", e.target.checked)}
                    />
                    {t("isConsumable")}
                </label>
            </div>

            {saveError && <p className="text-sm text-destructive">{t("saveError")}</p>}
        </div>
    );
}
