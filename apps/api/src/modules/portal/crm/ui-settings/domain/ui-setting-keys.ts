/**
 * Ключи настроек интерфейса. Значение уезжает в БД и в кеш, поэтому переименование ключа
 * обесценивает уже сохранённые настройки — менять только осознанно.
 */
export const UiSettingKey = {
    /** Поля на карточке канбана заказов */
    ORDER_KANBAN_CARD: "kanban.order.card-fields",
} as const;

export type UiSettingKey = (typeof UiSettingKey)[keyof typeof UiSettingKey];

const KEYS: ReadonlySet<string> = new Set(Object.values(UiSettingKey));

export const isUiSettingKey = (raw: string): raw is UiSettingKey => KEYS.has(raw);
