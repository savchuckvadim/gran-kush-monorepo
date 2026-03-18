import { Global, Module } from "@nestjs/common";

import { EncryptionService } from "@encryption/application/services/encryption.service";

/**
 * Глобальный модуль шифрования
 * Предоставляет EncryptionService для всех модулей без необходимости импорта
 */
@Global()
@Module({
    providers: [EncryptionService],
    exports: [EncryptionService],
})
export class EncryptionModule {}
