import type React from "react";

/** Поле схемы формы (ответ form-schema эндпоинтов CRM/LK). */
export type FormSchemaField = {
    fieldKey: string;
    type: string;
    label: string | null;
    helpText: string | null;
    required: boolean;
    visible: boolean;
    readOnly: boolean;
    isMultiple: boolean;
    sortOrder?: number;
    sectionCode?: string | null;
    defaultValueJson?: unknown;
    validationJson?: unknown;
    options: { valueKey: string; label: string; sortOrder: number; color: string | null }[];
};

export type DynamicFormValues = Record<string, unknown>;

/**
 * Адаптер файловых полей (file/signature/document): рендер контролируется
 * приложением (web — canvas подписи и загрузка в аккаунт, CRM — multipart),
 * пакет отдаёт слот.
 */
export type FileFieldRenderer = (args: {
    field: FormSchemaField;
    value: unknown;
    onChange: (value: unknown) => void;
    disabled?: boolean;
}) => React.ReactNode;
