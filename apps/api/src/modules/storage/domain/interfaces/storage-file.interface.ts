import { FileCategory } from "../enums/file-category.enum";
import { StorageType } from "../enums/storage-type.enum";

export interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
    destination?: string;
    filename?: string;
    path?: string;
}

export interface StorageFile {
    id: string;
    userId: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    storageType: StorageType;
    category: FileCategory;
    path: string; // Относительный путь от корня storage
    url: string; // Полный URL для доступа к файлу
    createdAt: Date;
    updatedAt: Date;
}

export interface UploadFileDto {
    file: MulterFile;
    userId: string;
    category: FileCategory;
    storageType?: StorageType; // По умолчанию private для member-document и member-signature
}

export interface FileMetadata {
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    path: string;
    url: string;
}
