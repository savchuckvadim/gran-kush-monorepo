export const MiB = 1024 * 1024;

const envPositive = (key: string, fallback: number): number => {
    const raw = process.env[key];
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Потолки на файлы аккаунта. Документ — фото паспорта с телефона (2–6 МБ), подпись — PNG
 * с canvas (десятки КБ). Размеры переопределяются окружением в мегабайтах.
 *
 * `documentsPerAccount` нужен потому, что тип документа — свободная строка: без потолка
 * один аккаунт заводил бы неограниченно много пар (тип, сторона), а каждая — объект в S3.
 */
export const UPLOAD_LIMITS = {
    documentBytes: envPositive("UPLOAD_MAX_DOCUMENT_MB", 8) * MiB,
    signatureBytes: envPositive("UPLOAD_MAX_SIGNATURE_MB", 2) * MiB,
    documentsPerAccount: Math.floor(envPositive("UPLOAD_MAX_DOCUMENTS_PER_ACCOUNT", 10)),
};

/** Обычный JSON: формы и фильтры, файлов в нём нет. */
export const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT ?? "1mb";

/**
 * Маршруты, принимающие файлы как base64 data URL. Худший случай — два документа и подпись
 * в одном запросе (`POST /lk/auth/member/files`), base64 раздувает на треть. Считается от
 * лимитов на файл, чтобы потолок тела не разошёлся с ними при переопределении через env.
 * `client_max_body_size` в nginx должен быть не меньше — иначе 413 придёт оттуда.
 */
export const UPLOAD_JSON_BODY_LIMIT = `${
    Math.ceil(((2 * UPLOAD_LIMITS.documentBytes + UPLOAD_LIMITS.signatureBytes) * 4) / 3 / MiB) + 1
}mb`;
