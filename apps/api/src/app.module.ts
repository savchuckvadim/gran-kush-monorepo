import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { getThrottlerConfig } from "./common/config/throttler/throttler.config";
import { IdempotencyModule } from "./common/idempotency";
import { PrismaModule } from "./common/prisma/prisma.module";
import { QueueModule } from "./common/queue/queue.module";
import { TelegramModule } from "./common/telegram/telegram.module";
import { CoreModule } from "./core/core.module";
import { AccountModule } from "./modules/account/account.module";
import { BillingModule } from "./modules/billing/billing.module";
import { CrmModule } from "./modules/crm/crm.module";
import { CronModule } from "./modules/cron/cron.module";
import { EncryptionModule } from "./modules/encryption/encryption.module";
import { HealthModule } from "./modules/health/health.module";
import { MailModule } from "./modules/mail/mail.module";
import { PlatformModule } from "./modules/platform/platform.module";
import { AuthModule } from "./modules/portal/auth/auth.module";
import { StorageModule } from "./modules/storage/storage.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [".env"],
            expandVariables: true,
        }),
        ThrottlerModule.forRoot(getThrottlerConfig()),
        CoreModule,
        PrismaModule,
        IdempotencyModule,
        QueueModule,
        TelegramModule,
        MailModule,
        EncryptionModule,
        AuthModule,
        AccountModule,
        CrmModule,
        PlatformModule,
        CronModule,
        BillingModule,
        StorageModule,
        HealthModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        // Глобально: лимит применяется ко всему, точечные наборы вешаются @Throttle.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppModule {}
