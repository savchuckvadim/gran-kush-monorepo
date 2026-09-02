/**
 * Тип файла определяется по сигнатуре содержимого, а не по заявленному клиентом MIME
 * или расширению: и то и другое приходит от клиента и ничего не гарантирует.
 */
export const UPLOAD_MIME = {
    JPEG: "image/jpeg",
    PNG: "image/png",
    WEBP: "image/webp",
    PDF: "application/pdf",
} as const;

export type UploadMime = (typeof UPLOAD_MIME)[keyof typeof UPLOAD_MIME];

export const EXTENSION_BY_MIME: Record<UploadMime, string> = {
    [UPLOAD_MIME.JPEG]: "jpg",
    [UPLOAD_MIME.PNG]: "png",
    [UPLOAD_MIME.WEBP]: "webp",
    [UPLOAD_MIME.PDF]: "pdf",
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const detectUploadMime = (buffer: Buffer): UploadMime | null => {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return UPLOAD_MIME.JPEG;
    }
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        return UPLOAD_MIME.PNG;
    }
    if (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return UPLOAD_MIME.WEBP;
    }
    if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") {
        return UPLOAD_MIME.PDF;
    }
    return null;
};

/**
 * MIME для отдачи файла по пути в хранилище. Расширение здесь — наше собственное,
 * выставленное по сигнатуре при загрузке, поэтому ему можно верить. Неизвестное
 * расширение отдаётся как бинарник: браузер не станет его интерпретировать.
 */
export const mimeForStoragePath = (storagePath: string): string => {
    const extension = storagePath.toLowerCase().split(".").pop() ?? "";
    const found = (Object.entries(EXTENSION_BY_MIME) as [UploadMime, string][]).find(
        ([, ext]) => ext === extension || (extension === "jpeg" && ext === "jpg")
    );
    return found?.[0] ?? "application/octet-stream";
};
