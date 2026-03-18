import { Module } from "@nestjs/common";

import { MembersModule } from "@members/members.module";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmQrCodesController } from "./api/controllers/crm-qr-codes.controller";
import { LkQrCodesController } from "./api/controllers/lk-qr-codes.controller";
import { QrCodesService } from "./application/services/qr-codes.service";
import { QrCodeRepository } from "./domain/repositories/qr-code-repository.interface";
import { QrCodePrismaRepository } from "./infrastructure/repositories/qr-code-prisma.repository";

@Module({
    imports: [PrismaModule, MembersModule],
    providers: [
        QrCodesService,
        {
            provide: QrCodeRepository,
            useClass: QrCodePrismaRepository,
        },
    ],
    controllers: [CrmQrCodesController, LkQrCodesController],
    exports: [QrCodesService],
})
export class QrCodesModule {}
