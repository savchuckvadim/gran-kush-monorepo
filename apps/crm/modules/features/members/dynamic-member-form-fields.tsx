"use client";

import { FieldInput } from "@workspace/ui";

import type { MemberFormSchemaField } from "@/modules/entities/member/model/member-form-schema-field";

export type { MemberFormSchemaField };

function formatFieldLabel(field: MemberFormSchemaField): string {
    return field.label?.trim() || field.fieldKey;
}

export function DynamicMemberFormFields({
    fields,
    values,
    onChange,
    disabled,
}: {
    fields: MemberFormSchemaField[];
    values: Record<string, unknown>;
    onChange: (fieldKey: string, value: unknown) => void;
    disabled?: boolean;
}) {
    const editable = fields.filter((f) => f.visible && !f.readOnly);

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {editable.map((field) => {
                const label = formatFieldLabel(field);
                const v = values[field.fieldKey];

                if (field.type === "boolean") {
                    return (
                        <label
                            key={field.fieldKey}
                            className="flex items-center gap-2 text-sm md:col-span-2"
                        >
                            <input
                                type="checkbox"
                                disabled={disabled}
                                checked={v === true}
                                onChange={(e) => onChange(field.fieldKey, e.target.checked)}
                            />
                            <span>
                                {label}
                                {field.required ? <span className="text-destructive"> *</span> : null}
                            </span>
                        </label>
                    );
                }

                if (field.type === "single_select" && field.options.length > 0) {
                    return (
                        <div key={field.fieldKey} className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                                {label}
                                {field.required ? <span className="text-destructive"> *</span> : null}
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
                        </div>
                    );
                }

                if (field.type === "text") {
                    return (
                        <div key={field.fieldKey} className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium">
                                {label}
                                {field.required ? <span className="text-destructive"> *</span> : null}
                            </label>
                            <textarea
                                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                disabled={disabled}
                                value={typeof v === "string" ? v : ""}
                                onChange={(e) => onChange(field.fieldKey, e.target.value)}
                            />
                            {field.helpText ? (
                                <p className="mt-1 text-xs text-muted-foreground">{field.helpText}</p>
                            ) : null}
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

                if (field.type === "file" || field.type === "signature" || field.type === "document") {
                    return (
                        <p
                            key={field.fieldKey}
                            className="text-xs text-muted-foreground md:col-span-2"
                        >
                            {label}: upload is not available in this form — use the member documents
                            flow after registration.
                        </p>
                    );
                }

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
                                onChange(field.fieldKey, raw === "" ? undefined : Number.parseInt(raw, 10));
                            } else if (field.type === "decimal") {
                                onChange(field.fieldKey, raw === "" ? undefined : Number.parseFloat(raw));
                            } else {
                                onChange(field.fieldKey, raw === "" ? undefined : raw);
                            }
                        }}
                        error={undefined}
                    />
                );
            })}
        </div>
    );
}
