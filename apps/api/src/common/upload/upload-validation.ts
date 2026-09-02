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

const DATA_URL =
    /^data:(?<mime>[\w.+-]+\/[\w.+-]+)(?:;[\w-]+=[\w-]+)*;base64,(?<payload>[A-Za-z0-9+/]+={0,2})$/u;

/**
 * `data:<mime>;base64,<payload>` → байты. Заявленный `<mime>` отбрасывается: см. `validateUpload`.
 * Полезная нагрузка проверяется как base64 целиком — `Buffer.from(…, "base64")` молча
 * пропускает посторонние символы, и мусор превращался бы в «файл».
 */
export const decodeDataUrl = (dataUrl: string): Buffer => {
    const match = DATA_URL.exec(dataUrl);
    if (!match?.groups?.payload) {
        throw new BadRequestException(
            "Invalid file format. Expected data URL with base64 payload."
        );
    }
    return Buffer.from(match.groups.payload, "base64");
};

export const validateDataUrl = (dataUrl: string, kind: UploadKind): ValidatedUpload =>
    validateUpload(decodeDataUrl(dataUrl), kind);
