/** Потолки публичного профиля клуба (карта клубов): текст и картинка видны всем посетителям. */
export const PUBLIC_PORTAL_LIMITS = {
    /** Колонка `text`: без потолка один запрос кладёт в базу и в ответ карты мегабайты текста */
    publicDescriptionLength: 2000,
    /** Колонка `cover_image_url` — `VarChar(500)`: длиннее база не примет и ответит 500 */
    coverImageUrlLength: 500,
} as const;

/** Обложка открывается в браузере посетителя: только http(s), не `javascript:` и не `data:`. */
export const COVER_IMAGE_URL_PROTOCOLS = ["http", "https"];
