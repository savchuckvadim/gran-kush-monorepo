import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { StorageType } from "@storage/domain/enums/storage-type.enum";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

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

    constructor(private readonly configService: ConfigService) {
        this.storageRoot = this.configService.get<string>("STORAGE_ROOT") || "./storage";
        this.publicStoragePath = path.join(this.storageRoot, "public");
        this.privateStoragePath = path.join(this.storageRoot, "private");
        this.baseUrl = this.configService.get<string>("BASE_URL") || "http://localhost:3000";
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
        const storagePath =
            storageType === StorageType.PUBLIC ? this.publicStoragePath : this.privateStoragePath;

        // Генерируем уникальное имя файла
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;

        // Путь относительно folder
        const folderPath = path.join(storagePath, folder);
        const filePath = path.join(folderPath, fileName);

        // Создаем директорию если не существует
        await fs.mkdir(folderPath, { recursive: true });

        // Сохраняем файл
        await fs.writeFile(filePath, file.buffer);

        // Формируем относительный путь и URL
        const relativePath = path.relative(this.storageRoot, filePath).replace(/\\/g, "/");
        const url = this.generateFileUrl(relativePath, storageType);

        return {
            fileName,
            filePath,
            relativePath,
            url,
        };
    }

    /**
     * Получить файл по относительному пути
     * @param relativePath - Относительный путь от корня storage (например: public/userId/filename.jpg)
     * @returns Buffer с содержимым файла
     */
    async getFile(relativePath: string): Promise<Buffer> {
        const fullPath = path.join(this.storageRoot, relativePath);
        try {
            return await fs.readFile(fullPath);
        } catch (error) {
            console.error(error);
            throw new Error(`File not found: ${relativePath}`);
        }
    }

    /**
     * Удалить файл по относительному пути
     * @param relativePath - Относительный путь от корня storage
     */
    async deleteFile(relativePath: string): Promise<void> {
        const fullPath = path.join(this.storageRoot, relativePath);
        try {
            await fs.unlink(fullPath);
        } catch (error) {
            console.error(error);
            // Игнорируем ошибку если файл уже удален
        }
    }

    /**
     * Генерация URL для файла
     */
    private generateFileUrl(relativePath: string, storageType: StorageType): string {
        if (storageType === StorageType.PUBLIC) {
            return `${this.baseUrl}/storage/${relativePath}`;
        }
        // Private файлы требуют аутентификации
        return `${this.baseUrl}/storage/private/${relativePath}`;
    }
}
