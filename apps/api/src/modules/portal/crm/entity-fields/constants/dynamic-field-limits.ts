/**
 * Потолки значений динамических полей. Правило поля (`validationJson.maxLength`) может их только
 * ужесточить: без потолка анкета, форма сотрудника или запись сущности принимали текст любого размера.
 */
export const DYNAMIC_FIELD_LIMITS = {
    stringMaxLength: 2_000,
    textMaxLength: 10_000,
    emailMaxLength: 254,
    urlMaxLength: 2_000,
    dateMaxLength: 64,
    multipleMaxItems: 50,
} as const;

/** Ссылка в поле `url` открывается у сотрудников и участников: только веб-адреса, без `javascript:`. */
export const ALLOWED_URL_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);
