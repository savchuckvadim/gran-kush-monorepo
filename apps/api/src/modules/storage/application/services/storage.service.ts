import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { StorageType } from "@storage/domain/enums/storage-type.enum";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import { S3Service } from "@common/s3";

export interface UploadFileResult {
    fileName: string;
    filePath: string; // Полный путь к файлу
    relativePath: string; // Относительный путь от корня storage (например: public/userId/filename.jpg)
    url: string; // URL для доступа к файлу
}

@Injectable()
export class StorageService {
    private readonly storageRoot: string;
    private readonly publicStoragePath: string;
    private readonly privateStoragePath: string;
    private readonly baseUrl: string;
    private readonly useS3: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly s3Service: S3Service
    ) {
        this.storageRoot = this.configService.get<string>("STORAGE_ROOT") || "./storage";
        this.publicStoragePath = path.join(this.storageRoot, "public");
        this.privateStoragePath = path.join(this.storageRoot, "private");
        this.baseUrl = this.configService.get<string>("BASE_URL") || "http://localhost:3000";

        // S3 включаем только если сервис инициализировался (есть AWS_* env).
        this.useS3 = this.s3Service.isConfigured();
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
        // Определяем путь для сохранения
        // Генерируем уникальное имя файла
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;

        // relativePath всегда сохраняем в том же формате, что раньше в БД:
        // public/<folder>/<file> или private/<folder>/<file>
        const relativePath = path.join(storageType, folder, fileName).replace(/\\/g, "/");
        const key = relativePath; // key S3 совпадает с относительным путём (включая public/ или private/)

        if (this.useS3) {
            await this.s3Service.uploadBuffer({
                key,
                buffer: file.buffer,
                contentType: file.mimetype,
                isPublic: storageType === StorageType.PUBLIC,
            });

            const url = storageType === StorageType.PUBLIC ? this.s3Service.getPublicUrl(key) : "";
            return { fileName, filePath: key, relativePath, url };
        }

        const storagePath =
            storageType === StorageType.PUBLIC ? this.publicStoragePath : this.privateStoragePath;

        // Путь относительно folder
        const folderPath = path.join(storagePath, folder);
        const filePath = path.join(folderPath, fileName);

        // Создаем директорию если не существует
        await fs.mkdir(folderPath, { recursive: true });

        // Сохраняем файл
        await fs.writeFile(filePath, file.buffer);

        // Формируем URL (для local — сохраняем старую схему /storage/... через Nginx или статик).
        const url = this.generateFileUrl(relativePath, storageType);

        return { fileName, filePath, relativePath, url };
    }

    /**
     * Получить файл по относительному пути
     * @param relativePath - Относительный путь от корня storage (например: public/userId/filename.jpg)
     * @returns Buffer с содержимым файла
     */
    async getFile(relativePath: string): Promise<Buffer> {
        try {
            if (this.useS3) {
                return await this.s3Service.getObjectBuffer(relativePath);
            }

            const fullPath = path.join(this.storageRoot, relativePath);
            return await fs.readFile(fullPath);
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
        try {
            if (this.useS3) {
                await this.s3Service.deleteByKey(relativePath);
                return;
            }

            const fullPath = path.join(this.storageRoot, relativePath);
            await fs.unlink(fullPath);
        } catch (error) {
            console.error(error);
            // Игнорируем ошибку если файл уже удален
        }
    }

    /**
     * Генерация URL для файла
     */
    private generateFileUrl(relativePath: string, _storageType: StorageType): string {
        // relativePath включает префикс public/ или private/.
        // Для private может потребоваться проксирование/аутентификация на уровне роутов.
        return `${this.baseUrl}/storage/${relativePath}`;
    }
}
