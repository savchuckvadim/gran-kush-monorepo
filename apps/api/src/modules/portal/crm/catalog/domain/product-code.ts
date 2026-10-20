import { randomInt } from "crypto";

/**
 * Код товара для QR-этикетки (TASK-807): 8 знаков из алфавита без похожих друг на друга
 * (0/O, 1/I/L), чтобы его можно было прочитать с этикетки и ввести руками. В QR код идёт с
 * префиксом `P-`: так сканер отличает товар от кода входа участника.
 */
export const PRODUCT_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const PRODUCT_CODE_LENGTH = 8;
export const PRODUCT_CODE_PREFIX = "P-";
/** Сколько раз подобрать другой код, если выпавший уже занят в клубе */
export const PRODUCT_CODE_ATTEMPTS = 5;
/** Штрихкод упаковки: EAN/UPC/Code128 укладываются с запасом */
export const PRODUCT_BARCODE_MAX_LENGTH = 64;
/** Печатные знаки ASCII без пробелов; пустая строка — «штрихкода нет» */
export const PRODUCT_BARCODE_SHAPE = /^[!-~]*$/;

const CODE_SHAPE = new RegExp(`^[${PRODUCT_CODE_ALPHABET}]{${PRODUCT_CODE_LENGTH}}$`);

export const newProductCode = (): string =>
    Array.from(
        { length: PRODUCT_CODE_LENGTH },
        () => PRODUCT_CODE_ALPHABET[randomInt(PRODUCT_CODE_ALPHABET.length)]
    ).join("");

export const isProductCode = (value: string): boolean => CODE_SHAPE.test(value);

/** Код товара из строки сканера (`P-XXXXXXXX`, регистр любой) или `null`, если это не он. */
export const parseProductCode = (scanned: string): string | null => {
    const value = scanned.trim().toUpperCase();
    if (!value.startsWith(PRODUCT_CODE_PREFIX)) return null;
    const code = value.slice(PRODUCT_CODE_PREFIX.length);
    return isProductCode(code) ? code : null;
};

/** Штрихкод из формы: пробелы по краям не считаются, пустая строка — штрихкода нет. */
export const normalizeBarcode = (value: string | null | undefined): string | null => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

/** Код ошибки 409: штрихкод уже у другого товара клуба */
export const BARCODE_TAKEN = "barcode_taken";
