import { Global, Module } from "@nestjs/common";

import { EncryptionService } from "@encryption/application/services/encryption.service";
import { PortalCipherService } from "@encryption/application/services/portal-cipher.service";
import { PortalDataKeyRepository } from "@encryption/domain/portal-data-key.repository";
import { PortalDataKeyPrismaRepository } from "@encryption/infrastructure/portal-data-key-prisma.repository";

import { PrismaModule } from "@common/prisma/prisma.module";

/**
 * Глобальный модуль шифрования: `EncryptionService` (мастер-ключ, подписи) и `PortalCipherService`
 * (ключ данных на портал и цель — финансы и другие чувствительные данные клуба).
 */
@Global()
@Module({
    imports: [PrismaModule],
    providers: [
        EncryptionService,
        PortalCipherService,
        { provide: PortalDataKeyRepository, useClass: PortalDataKeyPrismaRepository },
    ],
    exports: [EncryptionService, PortalCipherService],
})
export class EncryptionModule {}
