/**
 * Какие поля показывать на карточке канбана. Набор задаётся в шестерёнке над доской и
 * хранится настройкой портала и сотрудника; здесь — только список доступного и значение
 * по умолчанию, одно на всех.
 *
 * Номер заказа не отключается: без него карточку не опознать.
 */
export const ORDER_CARD_FIELDS = [
    "total",
    "member",
    "payment",
    "items",
    "date",
    "employee",
    "nextStage",
] as const;

export type OrderCardField = (typeof ORDER_CARD_FIELDS)[number];

export const DEFAULT_ORDER_CARD_FIELDS: readonly OrderCardField[] = [
    "total",
    "member",
    "payment",
    "items",
    "date",
    "nextStage",
];

const KNOWN: ReadonlySet<string> = new Set(ORDER_CARD_FIELDS);

/**
 * Настройка приходит с сервера и могла быть записана другой версией клиента: незнакомые
 * поля отбрасываем, пустой набор — повод взять значения по умолчанию.
 */
export function parseCardFields(raw: readonly string[] | null | undefined): OrderCardField[] {
    if (!raw?.length) return [...DEFAULT_ORDER_CARD_FIELDS];
    const fields = raw.filter((field): field is OrderCardField => KNOWN.has(field));
    return fields.length > 0 ? fields : [...DEFAULT_ORDER_CARD_FIELDS];
}
