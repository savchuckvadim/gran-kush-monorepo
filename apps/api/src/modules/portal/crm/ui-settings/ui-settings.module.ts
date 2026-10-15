import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { RedisModule } from "@common/redis/redis.module";

import { CrmUiSettingsController } from "./api/controllers/crm-ui-settings.controller";
import { UiSettingsService } from "./application/services/ui-settings.service";
import { UiSettingRepository } from "./domain/repositories/ui-setting-repository.interface";
import { UiSettingPrismaRepository } from "./infrastructure/repositories/ui-setting-prisma.repository";

@Module({
    imports: [PrismaModule, RedisModule],
    providers: [
        UiSettingsService,
        {
            provide: UiSettingRepository,
            useClass: UiSettingPrismaRepository,
        },
    ],
    controllers: [CrmUiSettingsController],
    exports: [UiSettingsService],
})
export class UiSettingsModule {}
