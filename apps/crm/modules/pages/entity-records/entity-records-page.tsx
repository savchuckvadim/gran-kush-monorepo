"use client";

import { useMemo, useState } from "react";

import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
    DynamicFormFields,
    toSubmitPayload,
    validateDynamicValues,
    type FormSchemaField,
} from "@workspace/dynamic-forms";
import { Button } from "@workspace/ui";

import {
    useEntityFormSchema,
    useEntityStageCategories,
} from "@/modules/entities/entity-settings";
import {
    useCreateEntityRecord,
    useDeleteEntityRecord,
    useEntityRecords,
    useSetEntityRecordStage,
    useUpdateEntityRecord,
    type EntityRecord,
} from "@/modules/entities/entity-records";
import { getApiErrorMessage } from "@/modules/shared";

import { RecordsKanban } from "./records-kanban";
import { RecordsTable } from "./records-table";

type ViewMode = "table" | "kanban";

// ─── Record form modal ───────────────────────────────────────────────────────

function RecordFormModal({
    code,
    record,
    onClose,
}: {
    code: string;
    record: EntityRecord | null;
    onClose: () => void;
}) {
    const purpose = record ? "crm_detail" : "crm_create";
    const { data: schema, isLoading } = useEntityFormSchema(code, purpose);
    const createMutation = useCreateEntityRecord(code);
    const updateMutation = useUpdateEntityRecord(code);

    const initialValues = useMemo<Record<string, unknown>>(() => {
        if (!record) return {};
        const values: Record<string, unknown> = {};
        for (const field of record.fields) {
            values[field.fieldKey] = field.value as unknown;
        }
        return values;
    }, [record]);

    const [values, setValues] = useState<Record<string, unknown>>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    const fields = (schema?.fields ?? []) as FormSchemaField[];

    async function handleSubmit() {
        setError(null);
        const validationErrors = validateDynamicValues(fields, values);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        try {
            if (record) {
                await updateMutation.mutateAsync({
                    id: record.id,
                    body: { fields: toSubmitPayload(values) },
                });
                toast.success("Запись обновлена");
            } else {
                await createMutation.mutateAsync({ fields: toSubmitPayload(values) });
                toast.success("Запись создана");
            }
            onClose();
        } catch (e) {
            setError(getApiErrorMessage(e));
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-background p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-medium">
                        {record ? "Редактирование записи" : "Новая запись"}
                    </h2>
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Закрыть
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <DynamicFormFields
                            fields={fields}
                            values={values}
                            errors={errors}
                            disabled={isPending}
                            onChange={(key, value) =>
                                setValues((prev) => ({ ...prev, [key]: value }))
                            }
                        />
                        {error ? <p className="text-sm text-destructive">{error}</p> : null}
                        <Button onClick={handleSubmit} disabled={isPending}>
                            {isPending ? "Сохранение…" : "Сохранить"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function EntityRecordsPage({ code }: { code: string }) {
    const [view, setView] = useState<ViewMode>("table");
    const [editing, setEditing] = useState<EntityRecord | null>(null);
    const [showForm, setShowForm] = useState(false);

    const { data, isLoading } = useEntityRecords(code, { limit: 100 });
    const { data: stageCategories = [] } = useEntityStageCategories(code);
    const deleteMutation = useDeleteEntityRecord(code);
    const setStageMutation = useSetEntityRecordStage(code);

    const records = data?.items ?? [];

    const stages = useMemo(
        () =>
            stageCategories
                .flatMap((category) => category.stages)
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder),
        [stageCategories]
    );

    function openCreate() {
        setEditing(null);
        setShowForm(true);
    }

    function openEdit(record: EntityRecord) {
        setEditing(record);
        setShowForm(true);
    }

    function handleDelete(record: EntityRecord) {
        if (!confirm("Удалить запись?")) return;
        deleteMutation.mutate(record.id, {
            onSuccess: () => toast.success("Запись удалена"),
            onError: (e) => toast.error(e.message),
        });
    }

    function handleStageChange(record: EntityRecord, stageId: string) {
        setStageMutation.mutate(
            { id: record.id, stageId: stageId || null },
            { onError: (e) => toast.error(e.message) }
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Записи: {code}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Универсальный список записей смарт-процесса.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-md border p-0.5">
                        <button
                            type="button"
                            onClick={() => setView("table")}
                            className={`rounded px-3 py-1 text-sm ${
                                view === "table" ? "bg-muted font-medium" : "text-muted-foreground"
                            }`}
                        >
                            Таблица
                        </button>
                        <button
                            type="button"
                            onClick={() => setView("kanban")}
                            className={`rounded px-3 py-1 text-sm ${
                                view === "kanban" ? "bg-muted font-medium" : "text-muted-foreground"
                            }`}
                        >
                            Канбан
                        </button>
                    </div>
                    <Button size="sm" onClick={openCreate}>
                        <span className="inline-flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Запись
                        </span>
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : view === "table" ? (
                <RecordsTable
                    records={records}
                    stages={stages}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onStageChange={handleStageChange}
                />
            ) : (
                <RecordsKanban
                    records={records}
                    stages={stages}
                    onEdit={openEdit}
                    onStageChange={handleStageChange}
                />
            )}

            {showForm ? (
                <RecordFormModal
                    code={code}
                    record={editing}
                    onClose={() => setShowForm(false)}
                />
            ) : null}
        </div>
    );
}
