import {
    parseProductCode,
    PRODUCT_BARCODE_MAX_LENGTH,
    PRODUCT_BARCODE_SHAPE,
} from "@modules/portal/crm/catalog/domain/product-code";
import { parseQrToken } from "@modules/portal/crm/qr-codes/domain/qr-token";

export type ScannedCode =
    | { kind: "product"; code: string }
    | { kind: "member"; token: string }
    | { kind: "barcode"; barcode: string }
    | { kind: "unrecognized" };

/** Длина строки со сканера, которую API вообще разбирает: ссылки раскрывает фронт */
export const SCAN_CODE_MAX_LENGTH = 128;

/**
 * Что за строка пришла со сканера. Этикетка товара — `P-` и код (регистр любой); код входа
 * участника — 38 знаков base64url с подписью (`parseQrToken`); остальное, похожее на штрихкод
 * (печатные знаки без пробелов, до 64), ищется как штрихкод упаковки. Разбор — без обращения к БД.
 */
export const classifyScan = (raw: string): ScannedCode => {
    const value = raw.trim();
    const code = parseProductCode(value);
    if (code) return { kind: "product", code };
    if (parseQrToken(value)) return { kind: "member", token: value };
    if (value && value.length <= PRODUCT_BARCODE_MAX_LENGTH && PRODUCT_BARCODE_SHAPE.test(value)) {
        return { kind: "barcode", barcode: value };
    }
    return { kind: "unrecognized" };
};
