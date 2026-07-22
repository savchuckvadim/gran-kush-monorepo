"use client";

import { useState } from "react";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type {
    SchemaPortalFieldOptionInputDto,
    SchemaUpdatePortalMemberFieldDto,
} from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

import {
    useAddEntityFieldOption,
    useDeleteEntityField,
    useEntityFields,
    useUpdateEntityField,
    type EntityFieldDefinition,
} from "@/modules/entities/entity-settings";
import { getApiErrorMessage } from "@/modules/shared";

import { CreateFieldModal } from "./create-field-modal";

function AddOptionInline({ code, fieldKey }: { code: string; fieldKey: string }) {
    const addOption = useAddEntityFieldOption(code);
    const [valueKey, setValueKey] = useState("");
    const [label, setLabel] = useState("");

    async function handleAdd() {
        const body: SchemaPortalFieldOptionInputDto = {
            valueKey: valueKey.trim(),
            label: label.trim() || valueKey.trim(),
            sortOrder: 0,
        };
        try {
            await addOption.mutateAsync({ fieldKey, body });
            setValueKey("");
            setLabel("");
            toast.success("Опция добавлена");
        } catch (e) {
            toast.error(getApiErrorMessage(e) ?? "Ошибка");
        }
    }

    return (
        <div className="mt-2 flex gap-2">
            <input
                className="h-8 w-32 rounded border border-input bg-background px-2 text-xs"
                placeholder="value_key"
                value={valueKey}
                onChange={(e) => setValueKey(e.target.value)}
            />
            <input
                className="h-8 w-32 rounded border border-input bg-background px-2 text-xs"
                placeholder="Метка"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
            />
            <Button
                variant="outline"
                size="sm"
                onClick={handleAdd}
                disabled={!valueKey.trim() || addOption.isPending}
            >
                Добавить опцию
            </Button>
        </div>
    );
}

export function FieldsTab({ code }: { code: string }) {
    const { data: fields = [], isLoading } = useEntityFields(code);
    const deleteMutation = useDeleteEntityField(code);
    const updateMutation = useUpdateEntityField(code);
    const [showCreate, setShowCreate] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);

    function handleDelete(field: EntityFieldDefinition) {
        if (!confirm(`Удалить поле ${field.fieldKey}?`)) return;
        deleteMutation.mutate(field.fieldKey, {
            onSuccess: () => toast.success("Поле удалено"),
            onError: (e) => toast.error(e.message),
        });
    }

    function toggleActive(field: EntityFieldDefinition) {
        const body: SchemaUpdatePortalMemberFieldDto = { isActive: !field.isActive };
        updateMutation.mutate(
            { fieldKey: field.fieldKey, body },
            { onError: (e) => toast.error(e.message) }
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowCreate(true)}>
                    <span className="inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Добавить поле
                    </span>
                </Button>
            </div>

            <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                            <th className="px-3 py-2">Ключ</th>
                            <th className="px-3 py-2">Название</th>
                            <th className="px-3 py-2">Тип</th>
                            <th className="px-3 py-2">Флаги</th>
                            <th className="px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field) => {
                            const isSelect =
                                field.type === "single_select" || field.type === "multi_select";
                            return (
                                <tr key={field.id} className="border-b align-top last:border-b-0">
                                    <td className="px-3 py-2 font-mono text-xs">{field.fieldKey}</td>
                                    <td className="px-3 py-2">
                                        {field.labelOverride ?? field.label ?? "—"}
                                        {isSelect ? (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {field.options.map((option) => (
                                                    <span
                                                        key={option.id}
                                                        className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                                                    >
                                                        {option.label}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                        {isSelect && expanded === field.fieldKey ? (
                                            <AddOptionInline code={code} fieldKey={field.fieldKey} />
                                        ) : null}
                                        {isSelect ? (
                                            <button
                                                type="button"
                                                className="mt-1 text-xs text-primary hover:underline"
                                                onClick={() =>
                                                    setExpanded((prev) =>
                                                        prev === field.fieldKey
                                                            ? null
                                                            : field.fieldKey
                                                    )
                                                }
                                            >
                                                {expanded === field.fieldKey
                                                    ? "Скрыть"
                                                    : "+ опция"}
                                            </button>
                                        ) : null}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs">{field.type}</td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground">
                                        {field.isSystem ? "system " : ""}
                                        {field.isImmutable ? "immutable " : ""}
                                        {field.isActive ? "" : "(inactive)"}
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => toggleActive(field)}
                                            >
                                                {field.isActive ? "Выкл" : "Вкл"}
                                            </Button>
                                            {field.deletableByPortal ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive"
                                                    onClick={() => handleDelete(field)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showCreate ? (
                <CreateFieldModal code={code} onClose={() => setShowCreate(false)} />
            ) : null}
        </div>
    );
}
