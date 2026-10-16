import { Injectable, Logger } from "@nestjs/common";

import { EncryptionService } from "@encryption/application/services/encryption.service";

/** Префикс отличает зашифрованный номер от старого открытого, который был в БД до TASK-704. */
const SEALED_PREFIX = "enc1:";

/**
 * Номер удостоверения в БД хранится зашифрованным (AES-256-GCM): дамп базы или лишний SELECT
 * не должны раскрывать номера паспортов. Расшифровка прозрачна для кода: репозиторий отдаёт
 * номер открытым, пишет шифртекст.
 *
 * Старые значения без префикса читаются как есть и шифруются при старте API
 * (`DocumentNumberBackfill`), поэтому переход не требует остановки.
 */
@Injectable()
export class DocumentNumberCipher {
    private readonly logger = new Logger(DocumentNumberCipher.name);

    constructor(private readonly encryption: EncryptionService) {}

    isSealed(stored: string | null): boolean {
        return stored !== null && stored.startsWith(SEALED_PREFIX);
    }

    /** Для записи в БД. Пустой номер остаётся пустым. */
    seal(plain: string | null | undefined): string | null {
        if (plain === null || plain === undefined || plain === "") {
            return null;
        }
        return `${SEALED_PREFIX}${this.encryption.encrypt(plain)}`;
    }

    /**
     * Для выдачи наружу. Не удалось расшифровать (сменили ключ) — номера нет, а не 500:
     * остальной документ от этого не страдает, а причину видно в логе.
     */
    open(stored: string | null): string | null {
        if (stored === null) {
            return null;
        }
        if (!this.isSealed(stored)) {
            return stored;
        }
        try {
            return this.encryption.decrypt(stored.slice(SEALED_PREFIX.length));
        } catch {
            this.logger.error(
                "Document number cannot be decrypted: was ENCRYPTION_MASTER_KEY changed?"
            );
            return null;
        }
    }
}
