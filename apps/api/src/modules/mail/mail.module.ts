import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { getMailTransportConfig } from "@common/config/mail/mailer.config";
import { TelegramModule } from "@common/telegram/telegram.module";
import { PORTAL_EVENTS_QUEUE_NAME } from "@modules/portal/crm/portals/events/portal-events.constants";

import { MailService } from "./application/services/mail.service";
import { MAIL_TRANSPORT } from "./domain/mail-transport.interface";
import { MAIL_QUEUE_NAME } from "./events/mail-events.constants";
import { MailProcessor } from "./infrastructure/processors/mail.processor";
import { SmtpMailTransport } from "./infrastructure/transport/smtp-mail.transport";

@Global()
@Module({
    imports: [
        TelegramModule, // Global telegram module
        // QueueModule is global, no need to import it here
        // Register mail queue for this module
        BullModule.registerQueue({
            name: MAIL_QUEUE_NAME,
        }),
        BullModule.registerQueue({
            name: PORTAL_EVENTS_QUEUE_NAME,
        }),
    ],
    providers: [
        {
            provide: MAIL_TRANSPORT,
            useFactory: (config: ConfigService) =>
                new SmtpMailTransport(getMailTransportConfig(config)),
            inject: [ConfigService],
        },
        MailService,
        MailProcessor,
    ],
    exports: [MailService],
})
export class MailModule {}
