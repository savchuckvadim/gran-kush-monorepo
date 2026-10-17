"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button, FieldInput, FieldSelect } from "@workspace/ui";

import { useCategories, useCreateCategory } from "@/modules/entities/category";

const FALLBACK_CATEGORY_CODE = "category";

/** Код категории из названия: латиница и цифры через дефис; название без латиницы — запасной код. */
const toCategoryCode = (name: string): string =>
    name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || FALLBACK_CATEGORY_CODE;

/** Новая категория каталога; встаёт последней в порядке сортировки. */
export function CreateCategoryForm({ onCreated }: { onCreated: () => void }) {
    const t = useTranslations("crm.sections.settings.categories");
    const { data: categories } = useCategories();
    const create = useCreateCategory();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [parentId, setParentId] = useState("");

    const parents = useMemo(
        () => [...(categories ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
        [categories]
    );

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        create.mutate(
            {
                name: trimmed,
                code: toCategoryCode(trimmed),
                description: description.trim() || undefined,
                parentId: parentId || undefined,
                sortOrder: (categories?.length ?? 0) + 1,
            },
            {
                onSuccess: () => {
                    toast.success(t("created"));
                    onCreated();
                },
            }
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FieldInput
                label={t("fields.name")}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
            />
            <FieldInput
                label={t("fields.description")}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
            />
            <FieldSelect
                label={t("fields.parentCategory")}
                options={[
                    { value: "", label: t("fields.noParent") },
                    ...parents.map((category) => ({ value: category.id, label: category.name })),
                ]}
                value={parentId}
                onValueChange={setParentId}
            />
            {create.isError ? (
                <p role="alert" className="text-sm text-destructive">
                    {t("createError")}
                </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={create.isPending || !name.trim()}>
                {create.isPending ? t("creating") : t("submit")}
            </Button>
        </form>
    );
}
