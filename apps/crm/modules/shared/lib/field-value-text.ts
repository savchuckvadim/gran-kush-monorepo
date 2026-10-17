/**
 * Значение динамического поля как текст для карточки. Пустое — `null`; булево — `null` тоже:
 * отметки «да/нет» карточки показывают бейджами, а не строкой профиля.
 */
export const fieldValueText = (value: unknown): string | null => {
    if (value === null || value === undefined || value === "" || typeof value === "boolean") {
        return null;
    }
    if (Array.isArray(value)) return value.map(String).join(", ");
    return typeof value === "object" ? JSON.stringify(value) : String(value);
};
