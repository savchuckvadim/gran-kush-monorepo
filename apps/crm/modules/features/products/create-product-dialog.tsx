"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Loader2, Plus } from "lucide-react";

import type { SchemaCreateProductDto } from "@workspace/api-client/core";
import { Button, FieldInput, FieldSelect, ModalDialog } from "@workspace/ui";

import { useCategories } from "@/modules/entities/category";
import { useMeasurementUnits } from "@/modules/entities/measurement-unit";
import { useCreateProduct } from "@/modules/entities/product";

import { AudiencePicker } from "./audience-picker";

const INITIAL_FORM: SchemaCreateProductDto = {
    name: "",
    categoryId: "",
    measurementUnitId: "",
    price: 0,
    initialQuantity: 0,
};

export function CreateProductDialog() {
    const t = useTranslations("crm.products.form");
    const [open, setOpen] = useState(false);

    const createMutation = useCreateProduct();
    const { data: categories, isLoading: isCategoriesLoading } = useCategories();
    const { data: units, isLoading: isUnitsLoading } = useMeasurementUnits();

    const [form, setForm] = useState<SchemaCreateProductDto>(INITIAL_FORM);

    const canSelectCategory = !!categories?.length;
    const canSelectUnit = !!units?.length;

    const isSubmitDisabled = useMemo(
        () =>
            createMutation.isPending ||
            !form.name.trim() ||
            !form.categoryId ||
            !form.measurementUnitId ||
            !canSelectCategory ||
            !canSelectUnit,
        [
            createMutation.isPending,
            form.name,
            form.categoryId,
            form.measurementUnitId,
            canSelectCategory,
            canSelectUnit,
        ]
    );

    const handleChange = useCallback(
        (field: keyof SchemaCreateProductDto, value: string | number | boolean) => {
            setForm((prev) => ({ ...prev, [field]: value }));
        },
        []
    );

    const handleSubmit = useCallback(async () => {
        try {
            await createMutation.mutateAsync(form);
            setOpen(false);
            setForm(INITIAL_FORM);
        } catch {
            // Mutation state handles errors
        }
    }, [createMutation, form]);

    return (
        <ModalDialog
            open={open}
            onOpenChange={setOpen}
            title={t("createTitle")}
            scrollable
            trigger={
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("createButton")}
                </Button>
            }
        >
            <div className="space-y-4">
                <FieldInput
                    label={t("name")}
                    value={form.name}
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
                    value={form.categoryId}
                    onValueChange={(value) => handleChange("categoryId", value)}
                    disabled={isCategoriesLoading || !canSelectCategory}
                    helperText={
                        !isCategoriesLoading && !canSelectCategory
                            ? t("categoryRequiredHint")
                            : undefined
                    }
                />

                <FieldSelect
                    label={t("measurementUnit")}
                    placeholder={t("selectUnit")}
                    options={(units ?? []).map((u) => ({
                        value: u.id,
                        label: `${u.name} (${u.code})`,
                    }))}
                    value={form.measurementUnitId}
                    onValueChange={(value) => handleChange("measurementUnitId", value)}
                    disabled={isUnitsLoading || !canSelectUnit}
                    helperText={
                        !isUnitsLoading && !canSelectUnit ? t("unitRequiredHint") : undefined
                    }
                />

                <div className="grid grid-cols-2 gap-4">
                    <FieldInput
                        label={t("price")}
                        type="number"
                        value={String(form.price)}
                        onChange={(e) => handleChange("price", Number(e.target.value))}
                        required
                    />
                    <FieldInput
                        label={t("initialQuantity")}
                        type="number"
                        value={String(form.initialQuantity)}
                        onChange={(e) => handleChange("initialQuantity", Number(e.target.value))}
                        required
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

                <FieldInput
                    label={t("limitGramsPerUnit")}
                    helperText={t("limitGramsPerUnitHint")}
                    type="number"
                    value={form.limitGramsPerUnit == null ? "" : String(form.limitGramsPerUnit)}
                    onChange={(e) =>
                        setForm((prev) => ({
                            ...prev,
                            limitGramsPerUnit: e.target.value ? Number(e.target.value) : undefined,
                        }))
                    }
                />

                <AudiencePicker
                    value={form.audiences ?? []}
                    onChange={(audiences) => setForm((prev) => ({ ...prev, audiences }))}
                />

                {createMutation.isError && (
                    <p className="text-sm text-destructive">{t("createError")}</p>
                )}

                <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full">
                    {createMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("creating")}
                        </>
                    ) : (
                        t("create")
                    )}
                </Button>
            </div>
        </ModalDialog>
    );
}
