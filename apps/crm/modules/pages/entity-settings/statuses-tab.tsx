"use client";

import { useState } from "react";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, Input } from "@workspace/ui";

import {
    useAddStatusItem,
    useCreateStatusSet,
    useDeleteStatusItem,
    useEntityStatusSets,
    useUpdateStatusItem,
    type EntityStatusSet,
} from "@/modules/entities/entity-settings";
import { getApiErrorMessage } from "@/modules/shared";

const DEFAULT_COLOR = "#3b82f6";

function AddItemForm({ code, setId }: { code: string; setId: string }) {
    const addItem = useAddStatusItem(code);
    const [key, setKey] = useState("");
    const [label, setLabel] = useState("");
    const [color, setColor] = useState(DEFAULT_COLOR);

    async function handleAdd() {
        try {
            await addItem.mutateAsync({ setId, body: { key: key.trim(), label: label.trim(), color } });
            setKey("");
            setLabel("");
            toast.success("Статус добавлен");
        } catch (e) {
            toast.error(getApiErrorMessage(e) ?? "Ошибка");
        }
    }

    return (
        <div className="flex flex-wrap items-end gap-2">
            <div>
                <p className="mb-1 text-xs text-muted-foreground">Ключ</p>
                <Input
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="vip"
                    className="max-w-[140px]"
                />
            </div>
            <div>
                <p className="mb-1 text-xs text-muted-foreground">Название</p>
                <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="VIP"
                    className="max-w-[200px]"
                />
            </div>
            <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-10 cursor-pointer rounded border bg-background"
                title="Цвет статуса"
            />
            <Button
                variant="outline"
                size="sm"
                onClick={handleAdd}
                disabled={!key.trim() || !label.trim() || addItem.isPending}
            >
                <Plus className="mr-1 h-3 w-3" /> Добавить
            </Button>
        </div>
    );
}

function StatusSetCard({ code, statusSet }: { code: string; statusSet: EntityStatusSet }) {
    const updateItem = useUpdateStatusItem(code);
    const deleteItem = useDeleteStatusItem(code);

    async function handleToggleActive(itemId: string, isActive: boolean) {
        try {
            await updateItem.mutateAsync({ setId: statusSet.id, itemId, body: { isActive } });
        } catch (e) {
            toast.error(getApiErrorMessage(e) ?? "Ошибка");
        }
    }

    async function handleColor(itemId: string, color: string) {
        try {
            await updateItem.mutateAsync({ setId: statusSet.id, itemId, body: { color } });
        } catch (e) {
            toast.error(getApiErrorMessage(e) ?? "Ошибка");
        }
    }

    async function handleDelete(itemId: string, label: string) {
        if (!confirm(`Удалить статус «${label}»?`)) return;
        try {
            await deleteItem.mutateAsync({ setId: statusSet.id, itemId });
            toast.success("Статус удалён");
        } catch (e) {
            toast.error(getApiErrorMessage(e) ?? "Ошибка");
        }
    }

    return (
        <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
                <h3 className="font-mono text-sm font-medium">{statusSet.code}</h3>
                <div className="flex gap-1">
                    {statusSet.isSystem ? (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            системный
                        </span>
                    ) : null}
                    {statusSet.isImmutable ? (
                        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            неизменяемый
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="space-y-1">
                {statusSet.items.map((item) => (
                    <div
                        key={item.id}
                        className="flex flex-wrap items-center gap-3 rounded border px-3 py-1.5 text-sm"
                    >
                        <input
                            type="color"
                            value={item.color ?? DEFAULT_COLOR}
                            onChange={(e) => handleColor(item.id, e.target.value)}
                            className="h-6 w-8 cursor-pointer rounded border bg-background"
                            disabled={statusSet.isImmutable}
                            title="Цвет"
                        />
                        <span className={item.isActive ? "" : "line-through opacity-50"}>
                            {item.label}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
                        {item.isSystem ? (
                            <span className="text-xs text-muted-foreground">системный</span>
                        ) : null}
                        <span className="ml-auto flex items-center gap-2">
                            <label className="inline-flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={item.isActive}
                                    disabled={statusSet.isImmutable}
                                    onChange={(e) =>
                                        handleToggleActive(item.id, e.target.checked)
                                    }
                                />
                                активен
                            </label>
                            {!item.isSystem && !statusSet.isImmutable ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleDelete(item.id, item.label)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            ) : null}
                        </span>
                    </div>
                ))}
            </div>

            {!statusSet.isImmutable ? <AddItemForm code={code} setId={statusSet.id} /> : null}
        </Card>
    );
}

function CreateStatusSetForm({ code }: { code: string }) {
    const createSet = useCreateStatusSet(code);
    const [open, setOpen] = useState(false);
    const [setCode, setSetCode] = useState("");

    async function handleCreate() {
        try {
            await createSet.mutateAsync({ code: setCode.trim(), items: [] });
            setOpen(false);
            setSetCode("");
            toast.success("Набор статусов создан");
        } catch (e) {
            toast.error(getApiErrorMessage(e) ?? "Ошибка");
        }
    }

    if (!open) {
        return (
            <Button variant="outline" onClick={() => setOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Новый набор статусов
            </Button>
        );
    }

    return (
        <Card className="flex flex-wrap items-end gap-2 p-4">
            <div>
                <p className="mb-1 text-xs text-muted-foreground">Код набора (snake_case)</p>
                <Input
                    value={setCode}
                    onChange={(e) => setSetCode(e.target.value)}
                    placeholder="lifecycle"
                    className="max-w-[200px]"
                />
            </div>
            <Button onClick={handleCreate} disabled={!setCode.trim() || createSet.isPending}>
                {createSet.isPending ? "Создание…" : "Создать"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
                Отмена
            </Button>
        </Card>
    );
}

export function StatusesTab({ code }: { code: string }) {
    const { data: statusSets = [], isLoading } = useEntityStatusSets(code);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {statusSets.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    У этой сущности пока нет наборов статусов.
                </p>
            ) : null}
            {statusSets.map((statusSet) => (
                <StatusSetCard key={statusSet.id} code={code} statusSet={statusSet} />
            ))}
            <CreateStatusSetForm code={code} />
        </div>
    );
}
