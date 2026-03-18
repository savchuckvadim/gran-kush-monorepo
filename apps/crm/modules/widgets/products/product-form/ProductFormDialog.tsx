"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { Loader2, Plus } from "lucide-react";

import type { SchemaCreateProductDto } from "@workspace/api-client/core";
import {
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    FieldInput,
} from "@workspace/ui";

import {
    useCategories,
    useCreateProduct,
    useMeasurementUnits,
} from "@/modules/entities/product";

export function ProductFormDialog() {
    const t = useTranslations("crm.products.form");
    const [open, setOpen] = useState(false);

    const createMutation = useCreateProduct();
    const { data: categories } = useCategories();
    const { data: units } = useMeasurementUnits();

    const [form, setForm] = useState<SchemaCreateProductDto>({
        name: "",
        categoryId: "",
        measurementUnitId: "",
        price: 0,
        initialQuantity: 0,
    });

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
            setForm({
                name: "",
                categoryId: "",
                measurementUnitId: "",
                price: 0,
                initialQuantity: 0,
            });
        } catch {
            // Ошибка обрабатывается в mutation state
        }
    }, [createMutation, form]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("createButton")}
                </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("createTitle")}</DialogTitle>
                </DialogHeader>

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

                    {/* Категория */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">{t("category")}</label>
                        <select
                            value={form.categoryId}
                            onChange={(e) => handleChange("categoryId", e.target.value)}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                            <option value="">{t("selectCategory")}</option>
                            {categories?.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Единица измерения */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">{t("measurementUnit")}</label>
                        <select
                            value={form.measurementUnitId}
                            onChange={(e) => handleChange("measurementUnitId", e.target.value)}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                            <option value="">{t("selectUnit")}</option>
                            {units?.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Цена и количество */}
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

                    {/* THC / CBD / Strain */}
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

                    {/* Ошибка */}
                    {createMutation.isError && (
                        <p className="text-sm text-destructive">{t("createError")}</p>
                    )}

                    <Button
                        onClick={handleSubmit}
                        disabled={
                            createMutation.isPending ||
                            !form.name ||
                            !form.categoryId ||
                            !form.measurementUnitId
                        }
                        className="w-full"
                    >
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
            </DialogContent>
        </Dialog>
    );
}
