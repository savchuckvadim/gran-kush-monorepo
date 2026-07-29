"use client";

import { useState } from "react";

import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, Input } from "@workspace/ui";

import {
    useCreateStageCategory,
    useDeleteStageCategory,
    useEntityStageCategories,
    useUpdateStageCategory,
    type EntityStageCategory,
} from "@/modules/entities/entity-settings";
import { getApiErrorMessage } from "@/modules/shared";

const SEMANTICS = [
    { value: "NEW", label: "Новая" },
    { value: "IN_PROGRESS", label: "В работе" },
    { value: "SUCCESS", label: "Успех" },
    { value: "FAILURE", label: "Провал" },
] as const;

type Semantic = (typeof SEMANTICS)[number]["value"];

interface StageRow {
    id?: string;
    name: string;
    color: string | null;
    semantic: Semantic;
}

const DEFAULT_COLOR = "#3b82f6";

function toRows(category: EntityStageCategory): StageRow[] {
    return category.stages
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((stage) => ({
            id: stage.id,
            name: stage.name,
            color: stage.color ?? null,
            semantic: stage.semantic as Semantic,
        }));
}

function StageCategoryCard({ code, category }: { code: string; category: EntityStageCategory }) {
    const updateCategory = useUpdateStageCategory(code);
    const deleteCategory = useDeleteStageCategory(code);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(category.name);
    const [rows, setRows] = useState<StageRow[]>(() => toRows(category));

    function startEdit() {
        setName(category.name);
        setRows(toRows(category));
        setEditing(true);
    }

    function patchRow(index: number, patch: Partial<StageRow>) {
        setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    }

    function move(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= rows.length) return;
        const next = rows.slice();
        [next[index], next[target]] = [next[target]!, next[index]!];
        setRows(next);
    }

    async function handleSave() {
        if (rows.length === 0) {
            toast.error("В воронке должна остаться хотя бы одна стадия");
            return;
        }
        try {
            await updateCategory.mutateAsync({
                categoryId: category.id,
                body: {
                    name,
                    stages: rows.map((row, index) => ({
                        ...(row.id ? { id: row.id } : {}),
                        name: row.name,
                        sortOrder: index,
                        color: row.color,
                        semantic: row.semantic,
                        isTerminalSuccess: row.semantic === "SUCCESS",
                        isTerminalFailure: row.semantic === "FAILURE",
                    })),
                },
            });
            setEditing(false);
            toast.success("Воронка сохранена");
        } catch (e) {
            toast.error(getApiErrorMessage(e) ?? "Ошибка");
        }
    }

    async function handleDelete() {
        if (!confirm(`Удалить воронку «${category.name}»?`)) return;
        try {
            await deleteCategory.mutateAsync(category.id);
            toast.success("Воронка удалена");
        } catch (e) {
            toast.error(getApiErrorMessage(e) ?? "Ошибка");
        }
    }

    if (!editing) {
        return (
            <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-medium">{category.name}</h3>
                    <div className="flex items-center gap-2">
                        {category.isDefault ? (
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                по умолчанию
                            </span>
                        ) : null}
                        <Button variant="outline" size="sm" onClick={startEdit}>
                            Редактировать
                        </Button>
                        {!category.isDefault && !category.isSystem ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={handleDelete}
                                disabled={deleteCategory.isPending}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        ) : null}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {category.stages
                        .slice()
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((stage) => (
                            <span
                                key={stage.id}
                                className="rounded-md border px-2 py-1 text-xs"
                                style={
                                    stage.color
                                        ? { borderColor: stage.color, color: stage.color }
                                        : undefined
                                }
                            >
                                {stage.name}
                            </span>
                        ))}
                </div>
            </Card>
        );
    }

    return (
        <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="max-w-xs"
                />
                <span className="font-mono text-xs text-muted-foreground">{category.code}</span>
            </div>

            <div className="space-y-2">
                {rows.map((row, index) => (
                    <div key={row.id ?? `new-${index}`} className="flex items-center gap-2">
                        <div className="flex flex-col">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => move(index, -1)}
                            >
                                <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => move(index, 1)}
                            >
                                <ArrowDown className="h-3 w-3" />
                            </Button>
                        </div>
                        <Input
                            value={row.name}
                            onChange={(e) => patchRow(index, { name: e.target.value })}
                            className="max-w-[200px]"
                        />
                        <input
                            type="color"
                            value={row.color ?? DEFAULT_COLOR}
                            onChange={(e) => patchRow(index, { color: e.target.value })}
                            className="h-8 w-10 cursor-pointer rounded border bg-background"
                            title="Цвет стадии"
                        />
                        <select
                            className="rounded-md border bg-background px-2 py-1.5 text-sm"
                            value={row.semantic}
                            onChange={(e) =>
                                patchRow(index, { semantic: e.target.value as Semantic })
                            }
                        >
                            {SEMANTICS.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground"
                            title="Удалить стадию"
                            onClick={() => setRows(rows.filter((_, i) => i !== index))}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={() =>
                    setRows([
                        ...rows,
                        { name: "Новая стадия", color: DEFAULT_COLOR, semantic: "IN_PROGRESS" },
                    ])
                }
            >
                <Plus className="mr-1 h-3 w-3" /> Стадия
            </Button>

            <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateCategory.isPending}>
                    {updateCategory.isPending ? "Сохранение…" : "Сохранить"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                    Отмена
                </Button>
            </div>
        </Card>
    );
}

function CreateFunnelForm({ code }: { code: string }) {
    const createCategory = useCreateStageCategory(code);
    const [open, setOpen] = useState(false);
    const [funnelCode, setFunnelCode] = useState("");
    const [funnelName, setFunnelName] = useState("");

    async function handleCreate() {
        try {
            await createCategory.mutateAsync({
                code: funnelCode.trim(),
                name: funnelName.trim(),
                stages: [
                    { name: "New", sortOrder: 0, semantic: "NEW", color: "#3b82f6" },
                    {
                        name: "Done",
                        sortOrder: 1,
                        semantic: "SUCCESS",
                        color: "#22c55e",
                        isTerminalSuccess: true,
                    },
                ],
            });
            setOpen(false);
            setFunnelCode("");
            setFunnelName("");
            toast.success("Воронка создана");
        } catch (e) {
            toast.error(getApiErrorMessage(e) ?? "Ошибка");
        }
    }

    if (!open) {
        return (
            <Button variant="outline" onClick={() => setOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Новая воронка
            </Button>
        );
    }

    return (
        <Card className="flex flex-wrap items-end gap-2 p-4">
            <div>
                <p className="mb-1 text-xs text-muted-foreground">Код (snake_case)</p>
                <Input
                    value={funnelCode}
                    onChange={(e) => setFunnelCode(e.target.value)}
                    placeholder="sales"
                    className="max-w-[160px]"
                />
            </div>
            <div>
                <p className="mb-1 text-xs text-muted-foreground">Название</p>
                <Input
                    value={funnelName}
                    onChange={(e) => setFunnelName(e.target.value)}
                    placeholder="Продажи"
                    className="max-w-[220px]"
                />
            </div>
            <Button
                onClick={handleCreate}
                disabled={!funnelCode.trim() || !funnelName.trim() || createCategory.isPending}
            >
                {createCategory.isPending ? "Создание…" : "Создать"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
                Отмена
            </Button>
        </Card>
    );
}

export function StagesTab({ code }: { code: string }) {
    const { data: categories = [], isLoading } = useEntityStageCategories(code);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {categories.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    У этой сущности нет воронок и стадий.
                </p>
            ) : null}
            {categories.map((category) => (
                <StageCategoryCard key={category.id} code={code} category={category} />
            ))}
            <CreateFunnelForm code={code} />
        </div>
    );
}
