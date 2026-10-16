import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";

import { CabinetQrCodesController } from "./api/controllers/cabinet-qr-codes.controller";
import { CrmQrCodesController } from "./api/controllers/crm-qr-codes.controller";
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
    controllers: [CrmQrCodesController, CabinetQrCodesController],
    exports: [QrCodesService],
})
export class QrCodesModule {}
