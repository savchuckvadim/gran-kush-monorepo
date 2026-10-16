import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";

import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";

/**
 * Номера документов, записанные открытым текстом до TASK-704, шифруются при старте API.
 * Повторный запуск (другая реплика, перезапуск) ничего не меняет: уже зашифрованное пропускается.
 * Сбой не мешает запуску: номера останутся читаемыми, а попытка повторится на следующем старте.
 */
@Injectable()
export class DocumentNumberBackfill implements OnApplicationBootstrap {
    private readonly logger = new Logger(DocumentNumberBackfill.name);

    constructor(private readonly documents: UserDocumentRepository) {}

    async onApplicationBootstrap(): Promise<void> {
        try {
            const sealed = await this.documents.sealLegacyNumbers();
            if (sealed > 0) {
                this.logger.log(`Encrypted ${sealed} legacy document number(s)`);
            }
        } catch (error: unknown) {
            this.logger.error(`Document number backfill failed: ${String(error)}`);
        }
    }
}
