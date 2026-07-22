"use client";

import { useMemo, useState } from "react";

import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type {
    SchemaPortalFieldOptionInputDto,
    SchemaUpdatePortalMemberFieldDto,
} from "@workspace/api-client/core";
import { Button, Card, FieldInput } from "@workspace/ui";

import {
    useAddEntityFieldOption,
    useCreateEntityField,
    useDeleteEntityField,
    useEntityFields,
    useEntityFormSchema,
    useEntityStageCategories,
    useUpdateEntityField,
    useUpdateEntityForm,
    type EntityFieldDefinition,
    type FormPurpose,
} from "@/modules/entities/entity-settings";
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

const PURPOSES: { value: FormPurpose; label: string }[] = [
    { value: "public_registration", label: "Публичная регистрация" },
    { value: "crm_create", label: "Создание в CRM" },
    { value: "crm_detail", label: "Карточка в CRM" },
    { value: "member_cabinet", label: "Кабинет клиента" },
];

const TABS = [
    { id: "fields", label: "Поля" },
    { id: "forms", label: "Формы" },
    { id: "stages", label: "Стадии" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Fields tab ────────────────────────────────────────────────────────────────

function CreateFieldModal({ code, onClose }: { code: string; onClose: () => void }) {
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

function FieldsTab({ code }: { code: string }) {
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

// ─── Forms tab ─────────────────────────────────────────────────────────────────

interface LayoutRow {
    fieldKey: string;
    label: string;
    required: boolean;
    visible: boolean;
    readOnly: boolean;
    sortOrder: number;
}

function FormsTab({ code }: { code: string }) {
    const [purpose, setPurpose] = useState<FormPurpose>("crm_create");
    const { data, isLoading, isFetching } = useEntityFormSchema(code, purpose);
    const updateForm = useUpdateEntityForm(code);
    const [rows, setRows] = useState<LayoutRow[] | null>(null);

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
                        </div>
                    ))}

                    {effectiveRows.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            Нет полей для этой формы
                        </p>
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

// ─── Stages tab ────────────────────────────────────────────────────────────────

function StagesTab({ code }: { code: string }) {
    const { data: categories = [], isLoading } = useEntityStageCategories(code);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                У этой сущности нет воронок и стадий.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {categories.map((category) => (
                <Card key={category.id} className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-medium">{category.name}</h3>
                        {category.isDefault ? (
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                по умолчанию
                            </span>
                        ) : null}
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
            ))}
        </div>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function EntitySettingsPage({ code }: { code: string }) {
    const [tab, setTab] = useState<TabId>("fields");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Настройка сущности: {code}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Поля, формы по назначению и стадии воронок.
                </p>
            </div>

            <div className="flex gap-2 border-b">
                {TABS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`-mb-px border-b-2 px-4 py-2 text-sm ${
                            tab === item.id
                                ? "border-primary font-medium text-foreground"
                                : "border-transparent text-muted-foreground"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === "fields" ? <FieldsTab code={code} /> : null}
            {tab === "forms" ? <FormsTab code={code} /> : null}
            {tab === "stages" ? <StagesTab code={code} /> : null}
        </div>
    );
}
