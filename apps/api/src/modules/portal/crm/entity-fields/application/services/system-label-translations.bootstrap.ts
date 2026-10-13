import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import { syncSystemLabelTranslations } from "@common/reference-data/system-label-translations.sync";

/**
 * На старте дописывает переводы подписей системных полей и статусов клубам, созданным
 * до их появления: прод чинится деплоем, без ручного SQL и без RUN_SEED.
 */
@Injectable()
export class SystemLabelTranslationsBootstrap implements OnApplicationBootstrap {
    private readonly logger = new Logger(SystemLabelTranslationsBootstrap.name);

    constructor(private readonly prisma: PrismaService) {}

    async onApplicationBootstrap(): Promise<void> {
        try {
            const filled = await syncSystemLabelTranslations(this.prisma);
            this.logger.log(
                `Label translations filled: ${filled.fieldDefinitions} fields, ` +
                    `${filled.statusItems} statuses, ${filled.stages} stages, ` +
                    `${filled.templateFields + filled.templateStatusItems + filled.templateStages} template rows`
            );
        } catch (error) {
            // Без переводов API работает на базовых подписях — старт из-за них не роняем
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Label translations sync failed: ${message}`);
        }
    }
}
