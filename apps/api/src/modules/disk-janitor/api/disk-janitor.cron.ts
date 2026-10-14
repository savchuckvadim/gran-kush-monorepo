import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { errorText } from "../application/error-text";
import { jobFailedMessage } from "../application/janitor-messages";
import { DiskJanitorService } from "../application/services/disk-janitor.service";
import { JanitorNotifier } from "../domain/janitor-notifier";
import { JanitorPolicy } from "../domain/janitor-policy";

/**
 * Schedule of the janitor process. One process for the whole server, so no locks across
 * replicas: unlike CronModule, this never runs inside the API.
 *
 * - 04:00 Madrid: nightly cleanup, after the database backups (03:30) and presence auto-close (03:00)
 * - every 10 minutes: disk check; a full disk gets an extra cleanup right away
 */
@Injectable()
export class DiskJanitorCron implements OnApplicationBootstrap {
    private readonly logger = new Logger(DiskJanitorCron.name);
    private readonly lastFailureNoticeAt = new Map<string, number>();

    constructor(
        private readonly janitor: DiskJanitorService,
        private readonly notifier: JanitorNotifier,
        private readonly policy: JanitorPolicy
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        await this.guard("проверка при старте", () => this.janitor.selfCheck());
    }

    @Cron("0 4 * * *", { name: "disk-janitor-nightly", timeZone: "Europe/Madrid" })
    async nightly(): Promise<void> {
        await this.guard("ночная уборка", () => this.janitor.runNightly());
    }

    @Cron(CronExpression.EVERY_10_MINUTES, { name: "disk-janitor-check" })
    async checkDisk(): Promise<void> {
        await this.guard("проверка диска", () => this.janitor.checkDiskPressure());
    }

    /** A broken job must not kill the process, nor flood the chat every 10 minutes. */
    private async guard(job: string, run: () => Promise<unknown>): Promise<void> {
        try {
            await run();
        } catch (error) {
            const reason = errorText(error);
            this.logger.error(`${job}: ${reason}`);
            const now = Date.now();
            const last = this.lastFailureNoticeAt.get(job);
            if (last !== undefined && now - last < this.policy.remindEveryMs) return;
            this.lastFailureNoticeAt.set(job, now);
            await this.notifier.notify(jobFailedMessage(job, reason));
        }
    }
}
