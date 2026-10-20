import { BadRequestException } from "@nestjs/common";

import { detectUploadMime, EXTENSION_BY_MIME, UPLOAD_MIME, UploadMime } from "./file-signature";
import { MiB, UPLOAD_LIMITS } from "./upload.config";

/** Документ удостоверения — фото или скан; подпись — только растровое изображение. */
export type UploadKind = "document" | "signature";

export interface ValidatedUpload {
    buffer: Buffer;
    mime: UploadMime;
    extension: string;
}

const RULES: Record<UploadKind, { allowed: readonly UploadMime[]; maxBytes: () => number }> = {
    document: {
        allowed: [UPLOAD_MIME.JPEG, UPLOAD_MIME.PNG, UPLOAD_MIME.WEBP, UPLOAD_MIME.PDF],
        maxBytes: () => UPLOAD_LIMITS.documentBytes,
    },
    signature: {
        allowed: [UPLOAD_MIME.JPEG, UPLOAD_MIME.PNG, UPLOAD_MIME.WEBP],
        maxBytes: () => UPLOAD_LIMITS.signatureBytes,
    },
};

const describe = (mimes: readonly UploadMime[]): string =>
    mimes.map((mime) => EXTENSION_BY_MIME[mime].toUpperCase()).join(", ");

/**
 * Единственная проверка на пути файла в хранилище: размер и тип по сигнатуре.
 * Заявленный клиентом MIME не участвует — тип берётся из байтов.
 */
export const validateUpload = (buffer: Buffer, kind: UploadKind): ValidatedUpload => {
    const rule = RULES[kind];

    if (buffer.length === 0) {
        throw new BadRequestException(`${kind} file is empty`);
    }

    const maxBytes = rule.maxBytes();
    if (buffer.length > maxBytes) {
        throw new BadRequestException(
            `${kind} file exceeds ${Math.round(maxBytes / MiB)} MB (${buffer.length} bytes)`
        );
    }

    const mime = detectUploadMime(buffer);
    if (!mime || !rule.allowed.includes(mime)) {
        throw new BadRequestException(
            `${kind} file type is not supported: expected ${describe(rule.allowed)}`
        );
    }

    return { buffer, mime, extension: EXTENSION_BY_MIME[mime] };
};

/** Заголовок до запятой: `data:<mime>[;param=value]*;base64` */
const DATA_URL_HEADER = /^data:(?<mime>[\w.+-]+\/[\w.+-]+)(?:;[\w-]+=[\w-]+)*;base64$/u;

const isBase64Char = (code: number): boolean =>
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code === 43 || // +
    code === 47; // /

/**
 * Полезная нагрузка проверяется посимвольно, а не регулярным выражением: на строке в несколько
 * мегабайт регулярка переполняла стек V8 («Maximum call stack size exceeded» на Linux в CI,
 * 2026-10-20), и файл чуть больше лимита отвечал 500 вместо 400. Разрешены только символы base64
 * и до двух `=` в конце — `Buffer.from(…, "base64")` молча пропускает посторонние символы, и
 * мусор превращался бы в «файл».
 */
const isBase64Payload = (payload: string): boolean => {
    let end = payload.length;
    while (end > 0 && end > payload.length - 2 && payload.charCodeAt(end - 1) === 61) end -= 1; // =
    if (end === 0) return false;
    for (let i = 0; i < end; i += 1) {
        if (!isBase64Char(payload.charCodeAt(i))) return false;
    }
    return true;
};

/** `data:<mime>;base64,<payload>` → байты. Заявленный `<mime>` отбрасывается: см. `validateUpload`. */
export const decodeDataUrl = (dataUrl: string): Buffer => {
    const comma = dataUrl.indexOf(",");
    const header = comma === -1 ? "" : dataUrl.slice(0, comma);
    const payload = comma === -1 ? "" : dataUrl.slice(comma + 1);
    if (!DATA_URL_HEADER.test(header) || !isBase64Payload(payload)) {
        throw new BadRequestException(
            "Invalid file format. Expected data URL with base64 payload."
        );
    }
    return Buffer.from(payload, "base64");
};

export const validateDataUrl = (dataUrl: string, kind: UploadKind): ValidatedUpload =>
    validateUpload(decodeDataUrl(dataUrl), kind);
