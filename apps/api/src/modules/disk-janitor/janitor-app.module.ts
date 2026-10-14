import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { TelegramModule } from "@common/telegram/telegram.module";

import { DiskJanitorModule } from "./disk-janitor.module";

/**
 * Root of the janitor process (src/janitor.main.ts), deliberately tiny: no HTTP, database, Redis or
 * queues. Its container holds the Docker socket, which is root on the server, so it gets nothing
 * else: no ports, no domain, no secrets beyond the Telegram bot.
 */
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env"], expandVariables: true }),
        ScheduleModule.forRoot(),
        TelegramModule,
        DiskJanitorModule,
    ],
})
export class JanitorAppModule {}
