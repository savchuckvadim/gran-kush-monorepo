import { Injectable } from "@nestjs/common";

import { StorageService } from "@storage/application/services/storage.service";
import { StorageType } from "@storage/domain/enums/storage-type.enum";

import { FinanceAttachmentStore } from "../../domain/repositories/finance-sources.interface";
import { LedgerCodec } from "../ledger/ledger-codec";

/** Шифротекст — не тот формат, что загрузил человек: хранилище видит только байты. */
const SEALED_MIME = "application/octet-stream";
const SEALED_EXTENSION = ".sealed";

/** Вложения проводок в private S3: папка клуба, имя — случайное, содержимое — шифр ключа портала. */
@Injectable()
export class FinanceAttachmentS3Store extends FinanceAttachmentStore {
    constructor(
        private readonly storage: StorageService,
        private readonly codec: LedgerCodec
    ) {
        super();
    }

    async put(portalId: string, entryId: string, file: Buffer): Promise<string> {
        const sealed = await this.codec.sealFile(portalId, entryId, file);
        const stored = await this.storage.uploadFile(
            {
                buffer: sealed,
                originalname: `${entryId}${SEALED_EXTENSION}`,
                mimetype: SEALED_MIME,
            },
            `finance/${portalId}`,
            StorageType.PRIVATE
        );
        return stored.relativePath;
    }

    async get(portalId: string, entryId: string, path: string): Promise<Buffer> {
        return this.codec.openFile(portalId, entryId, await this.storage.getFile(path));
    }

    remove(path: string): Promise<void> {
        return this.storage.deleteFile(path);
    }
}
