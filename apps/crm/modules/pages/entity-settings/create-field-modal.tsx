"use client";

import { useState } from "react";

import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, FieldInput } from "@workspace/ui";

import { useCreateEntityField } from "@/modules/entities/entity-settings";
import { getApiErrorMessage } from "@/modules/shared";

const FIELD_TYPES = [
    "string",
    "text",
    "int",
    "decimal",
    "boolean",
    "date",
    "datetime",
    "single_select",
    "multi_select",
    "email",
    "phone",
    "url",
    "file",
    "signature",
    "document",
    "relation",
] as const;

type FieldType = (typeof FIELD_TYPES)[number];

export function CreateFieldModal({ code, onClose }: { code: string; onClose: () => void }) {
    const createMutation = useCreateEntityField(code);
    const [fieldKey, setFieldKey] = useState("");
    const [label, setLabel] = useState("");
    const [type, setType] = useState<FieldType>("string");
    const [isMultiple, setIsMultiple] = useState(false);
    const [showInFilters, setShowInFilters] = useState(false);
    const [options, setOptions] = useState<{ valueKey: string; label: string }[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isSelect = type === "single_select" || type === "multi_select";

    async function handleSubmit() {
        setError(null);
        try {
            await createMutation.mutateAsync({
                fieldKey: fieldKey.trim(),
                type,
                label: label.trim(),
                isMultiple: type === "multi_select" ? true : isMultiple,
                showInFilters,
                sortOrder: 900,
                options: isSelect
                    ? options
                          .filter((o) => o.valueKey.trim())
                          .map((o, index) => ({
                              valueKey: o.valueKey.trim(),
                              label: o.label.trim() || o.valueKey.trim(),
                              sortOrder: index,
                          }))
                    : undefined,
            });
            toast.success("Поле создано");
            onClose();
        } catch (e) {
            setError(getApiErrorMessage(e));
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-medium">Новое поле</h2>
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Закрыть
                    </Button>
                </div>

                <div className="space-y-3">
                    <FieldInput
                        label="Ключ поля (fieldKey)"
                        placeholder="loyalty_tier"
                        value={fieldKey}
                        onChange={(e) => setFieldKey(e.target.value)}
                    />
                    <FieldInput
                        label="Название"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                    />
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Тип</label>
                        <select
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            value={type}
                            onChange={(e) => setType(e.target.value as FieldType)}
                        >
                            {FIELD_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                        <label className="inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={isMultiple}
                                onChange={(e) => setIsMultiple(e.target.checked)}
                            />
                            Множественное
                        </label>
                        <label className="inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={showInFilters}
                                onChange={(e) => setShowInFilters(e.target.checked)}
                            />
                            В фильтрах
                        </label>
                    </div>

                    {isSelect ? (
                        <div className="space-y-2 rounded-md border p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Опции</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setOptions((prev) => [...prev, { valueKey: "", label: "" }])
                                    }
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {options.map((option, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        className="h-8 flex-1 rounded border border-input bg-background px-2 text-sm"
                                        placeholder="value_key"
                                        value={option.valueKey}
                                        onChange={(e) =>
                                            setOptions((prev) =>
                                                prev.map((o, i) =>
                                                    i === index
                                                        ? { ...o, valueKey: e.target.value }
                                                        : o
                                                )
                                            )
                                        }
                                    />
                                    <input
                                        className="h-8 flex-1 rounded border border-input bg-background px-2 text-sm"
                                        placeholder="Метка"
                                        value={option.label}
                                        onChange={(e) =>
                                            setOptions((prev) =>
                                                prev.map((o, i) =>
                                                    i === index
                                                        ? { ...o, label: e.target.value }
                                                        : o
                                                )
                                            )
                                        }
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            setOptions((prev) => prev.filter((_, i) => i !== index))
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {error ? <p className="text-sm text-destructive">{error}</p> : null}

                    <Button
                        onClick={handleSubmit}
                        disabled={!fieldKey.trim() || !label.trim() || createMutation.isPending}
                    >
                        {createMutation.isPending ? "Сохранение…" : "Создать поле"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
