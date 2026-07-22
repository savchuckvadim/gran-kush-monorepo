import type { DynamicFormValues, FormSchemaField } from "./types";

export type FieldErrors = Record<string, string>;

/** Клиентская проверка обязательности/типов перед отправкой (сервер валидирует повторно). */
export function validateDynamicValues(
    fields: FormSchemaField[],
    values: DynamicFormValues
): FieldErrors {
    const errors: FieldErrors = {};

    for (const field of fields) {
        if (!field.visible || field.readOnly) {
            continue;
        }
        const value = values[field.fieldKey];
        const empty =
            value === undefined ||
            value === null ||
            value === "" ||
            (Array.isArray(value) && value.length === 0);

        if (field.required && empty) {
            errors[field.fieldKey] = "Обязательное поле";
            continue;
        }
        if (empty) {
            continue;
        }

        switch (field.type) {
            case "email": {
                if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    errors[field.fieldKey] = "Некорректный email";
                }
                break;
            }
            case "phone": {
                if (typeof value !== "string" || !/^\+?[1-9]\d{1,14}$/.test(value)) {
                    errors[field.fieldKey] = "Некорректный телефон";
                }
                break;
            }
            case "int": {
                if (typeof value !== "number" || !Number.isInteger(value)) {
                    errors[field.fieldKey] = "Введите целое число";
                }
                break;
            }
            case "decimal": {
                if (typeof value !== "number" || Number.isNaN(value)) {
                    errors[field.fieldKey] = "Введите число";
                }
                break;
            }
            default:
                break;
        }
    }

    return errors;
}

/** Отбрасывает пустые значения перед отправкой payload. */
export function toSubmitPayload(values: DynamicFormValues): DynamicFormValues {
    const out: DynamicFormValues = {};
    for (const [key, value] of Object.entries(values)) {
        if (value === undefined || value === "" || value === null) {
            continue;
        }
        out[key] = value;
    }
    return out;
}
