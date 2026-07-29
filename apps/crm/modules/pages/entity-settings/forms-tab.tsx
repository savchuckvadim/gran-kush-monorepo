"use client";

import { useMemo, useState } from "react";

import { ArrowDown, ArrowUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui";

import {
    useEntityFields,
    useEntityFormSchema,
    useUpdateEntityForm,
    type FormPurpose,
} from "@/modules/entities/entity-settings";
import { getApiErrorMessage } from "@/modules/shared";

const PURPOSES: { value: FormPurpose; label: string }[] = [
    { value: "public_registration", label: "Публичная регистрация" },
    { value: "crm_create", label: "Создание в CRM" },
    { value: "crm_detail", label: "Карточка в CRM" },
    { value: "member_cabinet", label: "Кабинет клиента" },
];

interface LayoutRow {
    fieldKey: string;
    label: string;
    required: boolean;
    visible: boolean;
    readOnly: boolean;
    sortOrder: number;
}

export function FormsTab({ code }: { code: string }) {
    const [purpose, setPurpose] = useState<FormPurpose>("crm_create");
    const { data, isLoading, isFetching } = useEntityFormSchema(code, purpose);
    const { data: allFields = [] } = useEntityFields(code);
    const updateForm = useUpdateEntityForm(code);
    const [rows, setRows] = useState<LayoutRow[] | null>(null);
    const [fieldToAdd, setFieldToAdd] = useState("");

    const serverRows = useMemo<LayoutRow[]>(
        () =>
            (data?.fields ?? [])
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((field) => ({
                    fieldKey: field.fieldKey,
                    label: field.label ?? field.fieldKey,
                    required: field.required,
                    visible: field.visible,
                    readOnly: field.readOnly,
                    sortOrder: field.sortOrder,
                })),
        [data]
    );

    const effectiveRows = rows ?? serverRows;

    function patchRow(index: number, patch: Partial<LayoutRow>) {
        setRows(effectiveRows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    }

    function move(index: number, direction: -1 | 1) {
        const next = effectiveRows.slice();
        const target = index + direction;
        const current = next[index];
        const swapWith = next[target];
        if (target < 0 || target >= next.length || !current || !swapWith) return;
        next[index] = swapWith;
        next[target] = current;
        setRows(next);
    }

    const availableFields = allFields.filter(
        (field) => !effectiveRows.some((row) => row.fieldKey === field.fieldKey)
    );

    function addField() {
        const field = allFields.find((f) => f.fieldKey === fieldToAdd);
        if (!field) return;
        setRows([
            ...effectiveRows,
            {
                fieldKey: field.fieldKey,
                label: field.label ?? field.fieldKey,
                required: false,
                visible: true,
                readOnly: false,
                sortOrder: effectiveRows.length,
            },
        ]);
        setFieldToAdd("");
    }

    function removeRow(index: number) {
        setRows(effectiveRows.filter((_, i) => i !== index));
    }

    async function handleSave() {
        try {
            await updateForm.mutateAsync({
                purpose,
                body: {
                    items: effectiveRows.map((row, index) => ({
                        fieldKey: row.fieldKey,
                        sortOrder: index,
                        required: row.required,
                        visible: row.visible,
                        readOnly: row.readOnly,
                    })),
                },
            });
            setRows(null);
            toast.success("Форма сохранена");
        } catch (e) {
            toast.error(getApiErrorMessage(e) ?? "Ошибка");
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                {PURPOSES.map((item) => (
                    <Button
                        key={item.value}
                        variant={purpose === item.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                            setPurpose(item.value);
                            setRows(null);
                        }}
                    >
                        {item.label}
                    </Button>
                ))}
            </div>

            {isLoading || isFetching ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-2">
                    {effectiveRows.map((row, index) => (
                        <div
                            key={row.fieldKey}
                            className="flex flex-wrap items-center gap-3 rounded border px-3 py-2 text-sm"
                        >
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
                            <div className="min-w-[160px] flex-1">
                                <p className="font-medium">{row.label}</p>
                                <p className="font-mono text-xs text-muted-foreground">
                                    {row.fieldKey}
                                </p>
                            </div>
                            <label className="inline-flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={row.visible}
                                    onChange={(e) => patchRow(index, { visible: e.target.checked })}
                                />
                                видимое
                            </label>
                            <label className="inline-flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={row.required}
                                    onChange={(e) =>
                                        patchRow(index, { required: e.target.checked })
                                    }
                                />
                                обязательное
                            </label>
                            <label className="inline-flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={row.readOnly}
                                    onChange={(e) =>
                                        patchRow(index, { readOnly: e.target.checked })
                                    }
                                />
                                только чтение
                            </label>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground"
                                title="Убрать из формы"
                                onClick={() => removeRow(index)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}

                    {effectiveRows.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            {data === null
                                ? "Форма для этого назначения ещё не создана — добавьте поля и сохраните."
                                : "Нет полей для этой формы"}
                        </p>
                    ) : null}

                    {availableFields.length > 0 ? (
                        <div className="flex items-center gap-2">
                            <select
                                className="rounded-md border bg-background px-2 py-1.5 text-sm"
                                value={fieldToAdd}
                                onChange={(e) => setFieldToAdd(e.target.value)}
                            >
                                <option value="">Добавить поле…</option>
                                {availableFields.map((field) => (
                                    <option key={field.fieldKey} value={field.fieldKey}>
                                        {field.label ?? field.fieldKey}
                                    </option>
                                ))}
                            </select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={addField}
                                disabled={!fieldToAdd}
                            >
                                Добавить
                            </Button>
                        </div>
                    ) : null}

                    <Button
                        onClick={handleSave}
                        disabled={rows === null || updateForm.isPending}
                    >
                        {updateForm.isPending ? "Сохранение…" : "Сохранить форму"}
                    </Button>
                </div>
            )}
        </div>
    );
}
