/**
 * Строка в QR — 38 знаков base64url без разделителей: 22 знака — id записи кода (16 байт UUID),
 * 16 знаков — подпись сервера к нему (первые 12 байт HMAC). Короткая строка даёт редкий QR
 * (версия 3 вместо ~15 у прежнего шифртекста): он читается с первого раза и с плохой камеры.
 * 96 бит подписи хватает с запасом: подбирать её можно только сканами через API.
 */
const ID_BYTES = 16;
const SIGNATURE_BYTES = 12;
const ID_CHARS = 22;

export const QR_TOKEN_LENGTH = 38;

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{38}$/;

export interface QrTokenParts {
    qrCodeId: string;
    signature: Buffer;
}

const uuidToBytes = (uuid: string): Buffer => Buffer.from(uuid.replace(/-/g, ""), "hex");

const bytesToUuid = (bytes: Buffer): string => {
    const hex = bytes.toString("hex");
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
    ].join("-");
};

export const formatQrToken = (qrCodeId: string, signature: Buffer): string =>
    uuidToBytes(qrCodeId).toString("base64url") +
    signature.subarray(0, SIGNATURE_BYTES).toString("base64url");

/** Строка, которая не может быть кодом входа, — `null`, без обращения к БД. */
export const parseQrToken = (token: string): QrTokenParts | null => {
    if (!TOKEN_SHAPE.test(token)) return null;
    const id = Buffer.from(token.slice(0, ID_CHARS), "base64url");
    const signature = Buffer.from(token.slice(ID_CHARS), "base64url");
    if (id.length !== ID_BYTES || signature.length !== SIGNATURE_BYTES) return null;
    const parts = { qrCodeId: bytesToUuid(id), signature };
    // у последнего знака base64url есть «лишние» биты: принимаем только каноничную запись,
    // чтобы у одного кода не было нескольких рабочих строк
    return formatQrToken(parts.qrCodeId, signature) === token ? parts : null;
};
