/** `?code=` или `?scan=` в строке запроса. */
const QUERY_CODE = /[?&](code|scan)=([^&#]+)/i;
/** `/scan/<код>` в пути. */
const PATH_CODE = /\/scan\/([^/?#]+)/i;

/**
 * Из того, что прочитала камера или ввели руками, — только сам код QR. В QR может лежать ссылка
 * на сканер CRM (`…/scan?code=…`, `…/scan/…`) для камеры телефона; переходить по ней нельзя —
 * это чужие данные, переход был бы открытым редиректом.
 */
export function normalizeScannedPayload(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;

    const query = trimmed.match(QUERY_CODE);
    if (query?.[2]) return decodeURIComponent(query[2]);

    if (/\/scan\b/i.test(trimmed)) {
        const path = trimmed.match(PATH_CODE);
        if (path?.[1]) return decodeURIComponent(path[1]);
    }

    return trimmed;
}
