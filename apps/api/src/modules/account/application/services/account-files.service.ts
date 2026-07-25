import { BadRequestException, Injectable } from "@nestjs/common";

import { StorageService } from "@storage/application/services/storage.service";
import { StorageType } from "@storage/domain/enums/storage-type.enum";

const MIME_TO_EXTENSION: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
};

/** Приватное хранение файлов аккаунта (base64 data URL → storagePath). */
@Injectable()
export class AccountFilesService {
    constructor(private readonly storageService: StorageService) {}

    async savePrivateDataUrl(dataUrl: string, userId: string, filePrefix: string): Promise<string> {
        const parsed = this.parseDataUrl(dataUrl);
        const extension = MIME_TO_EXTENSION[parsed.mimeType] ?? "bin";

        const result = await this.storageService.uploadFile(
            {
                buffer: parsed.buffer,
                originalname: `${filePrefix}.${extension}`,
                mimetype: parsed.mimeType,
            },
            `accounts/${userId}`,
            StorageType.PRIVATE
        );

        return result.relativePath;
    }

    async savePrivateBuffer(
        file: { buffer: Buffer; mimetype: string },
        userId: string,
        filePrefix: string
    ): Promise<string> {
        const extension = MIME_TO_EXTENSION[file.mimetype] ?? "bin";
        const result = await this.storageService.uploadFile(
            {
                buffer: file.buffer,
                originalname: `${filePrefix}.${extension}`,
                mimetype: file.mimetype,
            },
            `accounts/${userId}`,
            StorageType.PRIVATE
        );
        return result.relativePath;
    }

    private parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
        const match = /^data:(?<mimeType>[\w.+-]+\/[\w.+-]+);base64,(?<base64>.+)$/u.exec(dataUrl);

        if (!match?.groups?.mimeType || !match.groups.base64) {
            throw new BadRequestException(
                "Invalid file format. Expected data URL with base64 payload."
            );
        }

        return {
            mimeType: match.groups.mimeType,
            buffer: Buffer.from(match.groups.base64, "base64"),
        };
    }
}
