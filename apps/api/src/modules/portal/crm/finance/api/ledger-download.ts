import { StreamableFile } from "@nestjs/common";

import type { Response } from "express";

const NOT_ASCII_SAFE = /[^A-Za-z0-9._-]/g;

/**
 * Файл учёта для скачивания: имя по RFC 6266 (ASCII-запасное и UTF-8 — «Gestoría.pdf» не
 * ломает заголовок), без кэша и без угадывания типа браузером.
 */
export const ledgerDownload = (
    res: Response,
    file: { body: Buffer; contentType: string; fileName: string },
    disposition: "attachment" | "inline" = "attachment"
): StreamableFile => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const fallback = file.fileName.replace(NOT_ASCII_SAFE, "_");
    return new StreamableFile(file.body, {
        type: file.contentType,
        disposition: `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    });
};
