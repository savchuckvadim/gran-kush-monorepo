import type { EntityFieldDefinition } from "./api";

type FieldLabelSource = Pick<
    EntityFieldDefinition,
    "fieldKey" | "label" | "labelI18n" | "labelOverride"
>;

/**
 * Подпись поля из сырых настроек (`/crm/settings/entities/{code}/fields`) для показа.
 * Порядок тот же, что у API в формах и карточках: переименование клубом →
 * перевод системного поля на язык интерфейса → базовая подпись → ключ.
 */
export function getFieldDisplayLabel(field: FieldLabelSource, locale: string): string {
    if (field.labelOverride?.trim()) {
        return field.labelOverride;
    }
    const translated = field.labelI18n?.[locale];
    if (typeof translated === "string" && translated.trim()) {
        return translated;
    }
    return field.label || field.fieldKey;
}
