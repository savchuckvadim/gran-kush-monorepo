"use client";

import { FieldInput } from "@workspace/ui";

import type { DynamicFormValues, FileFieldRenderer, FormSchemaField } from "./types";
import type { FieldErrors } from "./validate";

function formatFieldLabel(field: FormSchemaField): string {
    return field.label?.trim() || field.fieldKey;
}

/**
 * Универсальный рендер динамической формы по схеме портала.
 * Файловые поля (file/signature/document) рендерятся через renderFileField;
 * без адаптера показывается подсказка.
 */
export function DynamicFormFields({
    fields,
    values,
    onChange,
    disabled,
    errors,
    renderFileField,
}: {
    fields: FormSchemaField[];
    values: DynamicFormValues;
    onChange: (fieldKey: string, value: unknown) => void;
    disabled?: boolean;
    errors?: FieldErrors;
    renderFileField?: FileFieldRenderer;
}) {
    const editable = fields.filter((f) => f.visible && !f.readOnly);

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {editable.map((field) => {
                const label = formatFieldLabel(field);
                const v = values[field.fieldKey];
                const error = errors?.[field.fieldKey];

                if (
                    field.type === "file" ||
                    field.type === "signature" ||
                    field.type === "document"
                ) {
                    if (renderFileField) {
                        return (
                            <div key={field.fieldKey} className="md:col-span-2">
                                {renderFileField({
                                    field,
                                    value: v,
                                    onChange: (value) => onChange(field.fieldKey, value),
                                    disabled,
                                })}
                                {error ? (
                                    <p className="mt-1 text-xs text-destructive">{error}</p>
                                ) : null}
                            </div>
                        );
                    }
                    return (
                        <p
                            key={field.fieldKey}
                            className="text-xs text-muted-foreground md:col-span-2"
                        >
                            {label}: загрузка недоступна в этой форме.
                        </p>
                    );
                }

                if (field.type === "boolean") {
                    return (
                        <div key={field.fieldKey} className="md:col-span-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    disabled={disabled}
                                    checked={v === true}
                                    onChange={(e) => onChange(field.fieldKey, e.target.checked)}
                                />
                                <span>
                                    {label}
                                    {field.required ? (
                                        <span className="text-destructive"> *</span>
                                    ) : null}
                                </span>
                            </label>
                            {error ? <p className="text-xs text-destructive">{error}</p> : null}
                        </div>
                    );
                }

                if (field.type === "single_select" && field.options.length > 0) {
                    return (
                        <div key={field.fieldKey} className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                                {label}
                                {field.required ? (
                                    <span className="text-destructive"> *</span>
                                ) : null}
                            </label>
                            <select
                                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                                disabled={disabled}
                                value={typeof v === "string" ? v : ""}
                                onChange={(e) =>
                                    onChange(field.fieldKey, e.target.value || undefined)
                                }
                            >
                                <option value="">—</option>
                                {field.options.map((o) => (
                                    <option key={o.valueKey} value={o.valueKey}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            {field.helpText ? (
                                <p className="text-xs text-muted-foreground">{field.helpText}</p>
                            ) : null}
                            {error ? <p className="text-xs text-destructive">{error}</p> : null}
                        </div>
                    );
                }

                if (field.type === "multi_select" && field.options.length > 0) {
                    const selected = Array.isArray(v)
                        ? v.filter((x): x is string => typeof x === "string")
                        : [];
                    return (
                        <div key={field.fieldKey} className="flex flex-col gap-1 md:col-span-2">
                            <span className="text-sm font-medium">
                                {label}
                                {field.required ? (
                                    <span className="text-destructive"> *</span>
                                ) : null}
                            </span>
                            <div className="flex flex-wrap gap-3">
                                {field.options.map((o) => (
                                    <label
                                        key={o.valueKey}
                                        className="flex items-center gap-1 text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            disabled={disabled}
                                            checked={selected.includes(o.valueKey)}
                                            onChange={(e) => {
                                                const next = e.target.checked
                                                    ? [...selected, o.valueKey]
                                                    : selected.filter((s) => s !== o.valueKey);
                                                onChange(
                                                    field.fieldKey,
                                                    next.length > 0 ? next : undefined
                                                );
                                            }}
                                        />
                                        {o.label}
                                    </label>
                                ))}
                            </div>
                            {error ? <p className="text-xs text-destructive">{error}</p> : null}
                        </div>
                    );
                }

                if (field.type === "text") {
                    return (
                        <div key={field.fieldKey} className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                {label}
                                {field.required ? (
                                    <span className="text-destructive"> *</span>
                                ) : null}
                            </label>
                            <textarea
                                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                disabled={disabled}
                                value={typeof v === "string" ? v : ""}
                                onChange={(e) => onChange(field.fieldKey, e.target.value)}
                            />
                            {field.helpText ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {field.helpText}
                                </p>
                            ) : null}
                            {error ? <p className="text-xs text-destructive">{error}</p> : null}
                        </div>
                    );
                }

                const inputType =
                    field.type === "date"
                        ? "date"
                        : field.type === "datetime"
                          ? "datetime-local"
                          : field.type === "email"
                            ? "email"
                            : field.type === "phone"
                              ? "tel"
                              : field.type === "int" || field.type === "decimal"
                                ? "number"
                                : "text";

                return (
                    <FieldInput
                        key={field.fieldKey}
                        label={label}
                        required={field.required}
                        type={inputType}
                        disabled={disabled}
                        value={v === undefined || v === null ? "" : String(v)}
                        onChange={(e) => {
                            const raw = e.target.value;
                            if (field.type === "int") {
                                onChange(
                                    field.fieldKey,
                                    raw === "" ? undefined : Number.parseInt(raw, 10)
                                );
                            } else if (field.type === "decimal") {
                                onChange(
                                    field.fieldKey,
                                    raw === "" ? undefined : Number.parseFloat(raw)
                                );
                            } else {
                                onChange(field.fieldKey, raw === "" ? undefined : raw);
                            }
                        }}
                        error={error}
                    />
                );
            })}
        </div>
    );
}
