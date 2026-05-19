import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./common/prisma/prisma.module";
import { QueueModule } from "./common/queue/queue.module";
import { TelegramModule } from "./common/telegram/telegram.module";
import { CoreModule } from "./core/core.module";
import { CrmModule } from "./modules/crm/crm.module";
import { CronModule } from "./modules/cron/cron.module";
import { EncryptionModule } from "./modules/encryption/encryption.module";
import { MailModule } from "./modules/mail/mail.module";
import { PlatformModule } from "./modules/platform/platform.module";
import { AuthModule } from "./modules/portal/auth/auth.module";
import { StorageModule } from "./modules/storage/storage.module";
import { TestModule } from "./modules/test/test.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [".env"],
            expandVariables: true,
        }),
        CoreModule,
        PrismaModule,
        QueueModule,
        TelegramModule,
        MailModule,
        EncryptionModule,
        AuthModule,
        CrmModule,
        PlatformModule,
        CronModule,
        StorageModule,
        TestModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
