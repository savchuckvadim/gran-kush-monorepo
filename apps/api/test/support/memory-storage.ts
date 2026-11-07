import { NotFoundException } from "@nestjs/common";

import { randomUUID } from "node:crypto";
import type request from "supertest";

/** S3 в e2e нет: хранилище в памяти, чтобы проверить, что туда уходит шифр, а не файл. */
export class MemoryStorage {
    readonly files = new Map<string, Buffer>();

    uploadFile(file: { buffer: Buffer; originalname: string }, folder: string, type: string) {
        const relativePath = `${type}/${folder}/${randomUUID()}-${file.originalname}`;
        this.files.set(relativePath, file.buffer);
        return Promise.resolve({
            fileName: file.originalname,
            filePath: relativePath,
            relativePath,
            url: "",
        });
    }

    getFile(path: string): Promise<Buffer> {
        const file = this.files.get(path);
        return file ? Promise.resolve(file) : Promise.reject(new NotFoundException(path));
    }

    deleteFile(path: string): Promise<void> {
        this.files.delete(path);
        return Promise.resolve();
    }
}

/** Тело ответа целиком в Buffer: supertest иначе разбирает только текст и JSON. */
export const binary = (
    res: request.Response,
    callback: (error: Error | null, body: Buffer) => void
) => {
    const chunks: Buffer[] = [];
    res.on("data", (chunk: Buffer) => chunks.push(chunk));
    res.on("end", () => callback(null, Buffer.concat(chunks)));
};
