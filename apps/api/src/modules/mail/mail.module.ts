import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { MailerModule } from "@nestjs-modules/mailer";

import { getMailerConfig } from "@common/config/mail/mailer.config";
import { TelegramModule } from "@common/telegram/telegram.module";

import { MailController } from "./api/controllers/mail.controller";
import { MailService } from "./application/services/mail.service";
import { MAIL_QUEUE_NAME } from "./events/mail-events.constants";
import { MailProcessor } from "./infrastructure/processors/mail.processor";

@Global()
@Module({
    imports: [
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: getMailerConfig,
            inject: [ConfigService],
        }),
        TelegramModule, // Global telegram module
        // QueueModule is global, no need to import it here
        // Register mail queue for this module
        BullModule.registerQueue({
            name: MAIL_QUEUE_NAME,
        }),
    ],
    providers: [MailService, MailProcessor],
    exports: [MailService],
    controllers: [MailController],
})
export class MailModule {}
