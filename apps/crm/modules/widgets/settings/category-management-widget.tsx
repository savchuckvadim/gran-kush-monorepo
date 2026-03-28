"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Loader2, Plus } from "lucide-react";

import { Button, Card, FieldInput } from "@workspace/ui";

import { useCategories, useCreateCategory } from "@/modules/entities/category";

function toCategoryCode(name: string): string {
    return (
        name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "category"
    );
}

export function CategoryManagementWidget() {
    const t = useTranslations("crm.sections.settings.categories");
    const { data: categories, isLoading } = useCategories();
    const createCategoryMutation = useCreateCategory();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [parentId, setParentId] = useState("");

    const sortedCategories = useMemo(
        () => [...(categories ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
        [categories]
    );

    const handleCreate = async () => {
        if (!name.trim()) return;

        try {
            await createCategoryMutation.mutateAsync({
                name: name.trim(),
                code: toCategoryCode(name),
                description: description.trim() || undefined,
                parentId: parentId || undefined,
                sortOrder: (categories?.length ?? 0) + 1,
            });

            setName("");
            setDescription("");
            setParentId("");
        } catch {
            // handled by mutation state
        }
    };

    return (
        <Card className="p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">{t("title")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
            </div>

            <div className="space-y-4">
                <FieldInput
                    label={t("fields.name")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />

                <FieldInput
                    label={t("fields.description")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("fields.parentCategory")}</label>
                    <select
                        value={parentId}
                        onChange={(e) => setParentId(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                        <option value="">{t("fields.noParent")}</option>
                        {sortedCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                {createCategoryMutation.isError && (
                    <p className="text-sm text-destructive">{t("createError")}</p>
                )}

                <Button
                    onClick={handleCreate}
                    disabled={createCategoryMutation.isPending || !name.trim()}
                    className="w-full sm:w-auto"
                >
                    {createCategoryMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("creating")}
                        </>
                    ) : (
                        <>
                            <Plus className="mr-2 h-4 w-4" />
                            {t("create")}
                        </>
                    )}
                </Button>
            </div>

            <div className="mt-6 rounded-md border bg-muted/20 p-4">
                <h3 className="mb-2 text-sm font-medium">{t("existing")}</h3>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("loading")}
                    </div>
                ) : sortedCategories.length > 0 ? (
                    <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        {sortedCategories.map((category) => (
                            <li
                                key={category.id}
                                className="rounded border bg-background px-2 py-1.5"
                            >
                                {category.name}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">{t("empty")}</p>
                )}
            </div>
        </Card>
    );
}
