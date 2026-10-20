/** В QR этикетки код товара идёт с префиксом: так сканер отличает его от кода участника. */
export const PRODUCT_LABEL_PREFIX = "P-";

/** Параметр адреса, с которым любая страница CRM открывает сканер на уже прочитанном коде. */
export const SCAN_CODE_PARAM = "scanCode";

export const isProductLabelCode = (code: string): boolean =>
    code.trim().toUpperCase().startsWith(PRODUCT_LABEL_PREFIX);

/**
 * Что лежит в QR этикетки: ссылка на сканер CRM этого клуба. Обычная камера телефона открывает
 * её у вошедшего сотрудника; сканер CRM берёт из ссылки только `P-<код>`.
 */
export const productLabelUrl = (place: {
    origin: string;
    locale: string;
    portal: string;
    code: string;
}): string =>
    `${place.origin}/${place.locale}/${place.portal}/scan?code=${PRODUCT_LABEL_PREFIX}${place.code}`;
