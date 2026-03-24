import { BadGatewayException, Injectable, NotFoundException } from "@nestjs/common";

import { StorageType } from "@storage/domain/enums/storage-type.enum";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import { S3Service } from "@common/s3";

export interface UploadFileResult {
    fileName: string;
    filePath: string; // S3 key
    relativePath: string; // Относительный путь от корня storage (например: public/userId/filename.jpg)
    url: string; // URL для доступа к файлу
}

@Injectable()
export class StorageService {
    constructor(private readonly s3Service: S3Service) {}

    private ensureS3Configured(): void {
        if (!this.s3Service.isConfigured()) {
            throw new BadGatewayException("S3 storage is not configured.");
        }
    }

    /**
     * Сохранить файл
     * @param file - Файл (Express.Multer.File или объект с buffer, originalname, mimetype)
     * @param folder - Имя папки (например, userId, productId и т.д.)
     * @param storageType - Тип хранилища (public или private)
     * @returns Информация о сохраненном файле
     */
    async uploadFile(
        file: { buffer: Buffer; originalname: string; mimetype: string },
        folder: string,
        storageType: StorageType = StorageType.PRIVATE
    ): Promise<UploadFileResult> {
        this.ensureS3Configured();

        // Генерируем уникальное имя файла
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;

        // Ключ S3 совпадает с относительным путём, который вы храните в БД:
        // public/<folder>/<file> или private/<folder>/<file>
        const relativePath = path.posix.join(storageType, folder, fileName);
        const key = relativePath;

        await this.s3Service.uploadBuffer({
            key,
            buffer: file.buffer,
            contentType: file.mimetype,
            isPublic: storageType === StorageType.PUBLIC,
        });

        const url = storageType === StorageType.PUBLIC ? this.s3Service.getPublicUrl(key) : "";

        return { fileName, filePath: key, relativePath, url };
    }

    /**
     * Получить файл по относительному пути
     * @param relativePath - Относительный путь от корня storage (например: public/userId/filename.jpg)
     * @returns Buffer с содержимым файла
     */
    async getFile(relativePath: string): Promise<Buffer> {
        this.ensureS3Configured();

        try {
            return await this.s3Service.getObjectBuffer(relativePath);
        } catch (error) {
            console.error(error);
            throw new NotFoundException(`File not found: ${relativePath}`);
        }
    }

    /**
     * Удалить файл по относительному пути
     * @param relativePath - Относительный путь от корня storage
     */
    async deleteFile(relativePath: string): Promise<void> {
        this.ensureS3Configured();

        try {
            await this.s3Service.deleteByKey(relativePath);
        } catch (error) {
            console.error(error);
            // Игнорируем ошибку если файл уже удален
        }
    }
}
