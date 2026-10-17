"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
    DynamicFormFields,
    type FormSchemaField,
    toSubmitPayload,
    validateDynamicValues,
} from "@workspace/dynamic-forms";
import { Button } from "@workspace/ui";

import {
    type EntityRecord,
    useCreateEntityRecord,
    useUpdateEntityRecord,
} from "@/modules/entities/entity-records";
import { useEntityFormSchema } from "@/modules/entities/entity-settings";
import { getApiErrorMessage } from "@/modules/shared";

interface RecordFormProps {
    code: string;
    /** The record being edited; none — a new one */
    record: EntityRecord | null;
    /** The stage a new record starts in; none — the first stage of the default funnel */
    stageId?: string;
    /** Manager and up; the others read the record */
    canEdit: boolean;
    onDone: () => void;
}

/** The record's fields by the entity's `crm_create` / `crm_detail` form. */
export function RecordForm({ code, record, stageId, canEdit, onDone }: RecordFormProps) {
    const t = useTranslations("crm.records");
    const { data: schema, isLoading } = useEntityFormSchema(
        code,
        record ? "crm_detail" : "crm_create"
    );
    const createMutation = useCreateEntityRecord(code);
    const updateMutation = useUpdateEntityRecord(code);

    const [values, setValues] = useState<Record<string, unknown>>(() => {
        const initial: Record<string, unknown> = {};
        for (const field of record?.fields ?? []) {
            const value: unknown = field.value;
            initial[field.fieldKey] = value;
        }
        return initial;
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    // DTO boundary: the generated schema type marks `label` optional, the form library's does not
    const fields = useMemo(() => (schema?.fields ?? []) as FormSchemaField[], [schema]);
    const isPending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = async () => {
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
                toast.success(t("updated"));
            } else {
                await createMutation.mutateAsync({ fields: toSubmitPayload(values), stageId });
                toast.success(t("created"));
            }
            onDone();
        } catch (e) {
            setError(getApiErrorMessage(e));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <DynamicFormFields
                fields={fields}
                values={values}
                errors={errors}
                disabled={isPending || !canEdit}
                onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
            />
            {error ? (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            ) : null}
            {canEdit ? (
                <Button onClick={handleSubmit} disabled={isPending}>
                    {isPending ? t("saving") : t("save")}
                </Button>
            ) : null}
        </div>
    );
}
