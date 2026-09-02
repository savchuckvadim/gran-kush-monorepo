import { BadRequestException, Injectable, Logger } from "@nestjs/common";

import { UserDocument, UserDocumentSide, UserSignature } from "@prisma/client";
import { StorageService } from "@storage/application/services/storage.service";
import { StorageType } from "@storage/domain/enums/storage-type.enum";

import { UPLOAD_LIMITS, UploadKind, ValidatedUpload, validateUpload } from "@common/upload";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";

/**
 * Единственный путь файла в аккаунт: проверка содержимого, приватный бакет, строка в БД,
 * удаление прежнего объекта. Документы и подпись аккаунт-уровневые и переиспользуются
 * между клубами, поэтому папка в хранилище — `accounts/<userId>`, а не портал.
 */
@Injectable()
export class AccountFilesService {
    private readonly logger = new Logger(AccountFilesService.name);

    constructor(
        private readonly storageService: StorageService,
        private readonly userDocumentRepository: UserDocumentRepository,
        private readonly userSignatureRepository: UserSignatureRepository
    ) {}

    async replaceDocument(input: {
        userId: string;
        type: string;
        side: UserDocumentSide;
        file: Buffer;
        number?: string | null;
    }): Promise<UserDocument> {
        const upload = validateUpload(input.file, "document");

        const existing = await this.userDocumentRepository.findByUserTypeSide(
            input.userId,
            input.type,
            input.side
        );
        if (!existing) {
            const count = await this.userDocumentRepository.countByUser(input.userId);
            if (count >= UPLOAD_LIMITS.documentsPerAccount) {
                throw new BadRequestException(
                    `Account cannot hold more than ${UPLOAD_LIMITS.documentsPerAccount} documents`
                );
            }
        }

        const storagePath = await this.store(upload, input.userId, "document");
        const document = await this.persist(storagePath, () =>
            this.userDocumentRepository.upsertByUserTypeSide({
                userId: input.userId,
                type: input.type,
                side: input.side,
                storagePath,
                number: input.number,
            })
        );
        await this.discard(existing?.storagePath, storagePath);
        return document;
    }

    async replaceSignature(input: { userId: string; file: Buffer }): Promise<UserSignature> {
        const upload = validateUpload(input.file, "signature");
        const existing = await this.userSignatureRepository.findByUser(input.userId);

        const storagePath = await this.store(upload, input.userId, "signature");
        const signature = await this.persist(storagePath, () =>
            this.userSignatureRepository.upsertByUser({ userId: input.userId, storagePath })
        );
        await this.discard(existing?.storagePath, storagePath);
        return signature;
    }

    async removeDocument(document: UserDocument): Promise<void> {
        await this.userDocumentRepository.deleteById(document.id);
        await this.discard(document.storagePath);
    }

    private async store(
        upload: ValidatedUpload,
        userId: string,
        kind: UploadKind
    ): Promise<string> {
        // Имя в хранилище — uuid плюс расширение по сигнатуре; от клиента сюда ничего не доходит
        const result = await this.storageService.uploadFile(
            {
                buffer: upload.buffer,
                originalname: `${kind}.${upload.extension}`,
                mimetype: upload.mime,
            },
            `accounts/${userId}`,
            StorageType.PRIVATE
        );
        return result.relativePath;
    }

    /** Строка не записалась — только что загруженный объект не должен остаться сиротой. */
    private async persist<T>(storagePath: string, write: () => Promise<T>): Promise<T> {
        try {
            return await write();
        } catch (error) {
            await this.discard(storagePath);
            throw error;
        }
    }

    /**
     * Прежний объект удаляется после записи новой строки, иначе в бакете копились бы все
     * версии удостоверения. Сбой удаления не отменяет загрузку — только логируется.
     */
    private async discard(storagePath: string | undefined, keep?: string): Promise<void> {
        if (!storagePath || storagePath === keep) return;
        try {
            await this.storageService.deleteFile(storagePath);
        } catch (error) {
            this.logger.warn(`Failed to delete ${storagePath}: ${String(error)}`);
        }
    }
}
