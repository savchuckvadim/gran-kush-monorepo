import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DiskJanitorCron } from "./api/disk-janitor.cron";
import { DiskJanitorService } from "./application/services/disk-janitor.service";
import { DiskProbe } from "./domain/disk-probe";
import { DockerEngine } from "./domain/docker-engine";
import { JanitorNotifier } from "./domain/janitor-notifier";
import { JanitorPolicy } from "./domain/janitor-policy";
import { DockerEngineHttp } from "./infrastructure/docker-engine.http";
import { HostDiskProbe } from "./infrastructure/host-disk.probe";
import { diskPathFrom, dockerSocketFrom, janitorPolicyFrom } from "./infrastructure/janitor-config";
import { TelegramJanitorNotifier } from "./infrastructure/telegram-janitor.notifier";

@Module({
    providers: [
        { provide: JanitorPolicy, useFactory: janitorPolicyFrom, inject: [ConfigService] },
        {
            provide: DockerEngine,
            useFactory: (config: ConfigService) => new DockerEngineHttp(dockerSocketFrom(config)),
            inject: [ConfigService],
        },
        {
            provide: DiskProbe,
            useFactory: (config: ConfigService) => new HostDiskProbe(diskPathFrom(config)),
            inject: [ConfigService],
        },
        { provide: JanitorNotifier, useClass: TelegramJanitorNotifier },
        DiskJanitorService,
        DiskJanitorCron,
    ],
})
export class DiskJanitorModule {}
