export type MemberFormSchemaField = {
    fieldKey: string;
    type: string;
    label: string | null;
    helpText: string | null;
    required: boolean;
    visible: boolean;
    readOnly: boolean;
    isMultiple: boolean;
    sortOrder?: number;
    defaultValueJson?: unknown;
    validationJson?: unknown;
    options: { valueKey: string; label: string; sortOrder: number; color: string | null }[];
};
