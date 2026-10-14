import { Injectable, Logger } from "@nestjs/common";

import type { CleanupReason, CleanupReport } from "../../domain/cleanup-report";
import {
    canCleanUp,
    type DiskPressureState,
    hasRecovered,
    isReminderDue,
    isUnderPressure,
    NO_PRESSURE,
} from "../../domain/disk-pressure";
import { DiskProbe } from "../../domain/disk-probe";
import { freedBytes, usedPercent } from "../../domain/disk-usage";
import { DockerEngine, type PruneResult } from "../../domain/docker-engine";
import { JanitorNotifier } from "../../domain/janitor-notifier";
import { JanitorPolicy } from "../../domain/janitor-policy";
import { errorText } from "../error-text";
import {
    cleanupFailedMessage,
    describeDisk,
    describeReport,
    dockerUnavailableMessage,
    nightlyReportMessage,
    pressureAlertMessage,
    pressureReminderMessage,
    pressureResolvedMessage,
    recoveredMessage,
} from "../janitor-messages";

/**
 * Keeps the server disk from filling up with Docker garbage (incident of 12.10.2026: disk at 100 %,
 * every Postgres on the server in a restart loop). A nightly cleanup, plus checks between nights:
 * a disk over the threshold gets an extra cleanup, and an alert if that does not help.
 */
@Injectable()
export class DiskJanitorService {
    private readonly logger = new Logger(DiskJanitorService.name);
    private pressure: DiskPressureState = NO_PRESSURE;
    private running: Promise<CleanupReport> | null = null;

    constructor(
        private readonly docker: DockerEngine,
        private readonly disk: DiskProbe,
        private readonly notifier: JanitorNotifier,
        private readonly policy: JanitorPolicy
    ) {}

    /** At start, so the container log shows at once whether the janitor can do its job. */
    async selfCheck(): Promise<boolean> {
        const usage = await this.disk.usage();
        this.logger.log(`disk ${describeDisk(usage)}, alert at ${this.policy.alertPercent}%`);
        try {
            await this.docker.ping();
            this.logger.log("Docker is reachable");
            return true;
        } catch (error) {
            const reason = errorText(error);
            this.logger.error(`Docker is not reachable: ${reason}`);
            await this.notifier.notify(dockerUnavailableMessage(reason));
            return false;
        }
    }

    async runNightly(): Promise<CleanupReport> {
        const report = await this.cleanUp("nightly");
        if (report.errors.length > 0) {
            await this.notifier.notify(cleanupFailedMessage(report));
        } else if (freedBytes(report.before, report.after) >= this.policy.reportMinFreedBytes) {
            await this.notifier.notify(nightlyReportMessage(report));
        }
        return report;
    }

    async checkDiskPressure(): Promise<void> {
        const now = Date.now();
        const usage = await this.disk.usage();
        const percent = usedPercent(usage);

        if (!isUnderPressure(percent, this.policy)) {
            if (this.pressure.alertedAt !== null && hasRecovered(percent, this.policy)) {
                this.pressure = { ...this.pressure, alertedAt: null };
                await this.notifier.notify(recoveredMessage(usage));
            }
            return;
        }

        const report = canCleanUp(this.pressure, now, this.policy)
            ? await this.cleanUp("disk-pressure")
            : null;
        if (report) this.pressure = { ...this.pressure, lastCleanupAt: now };

        if (report && !isUnderPressure(usedPercent(report.after), this.policy)) {
            // the cleanup coped: one message, nothing left open
            this.pressure = { ...this.pressure, alertedAt: null };
            await this.notifier.notify(pressureResolvedMessage(report));
            return;
        }

        const current = report?.after ?? usage;
        if (this.pressure.alertedAt === null) {
            this.pressure = { ...this.pressure, alertedAt: now };
            await this.notifier.notify(pressureAlertMessage(current, report));
        } else if (isReminderDue(this.pressure, now, this.policy)) {
            this.pressure = { ...this.pressure, alertedAt: now };
            await this.notifier.notify(pressureReminderMessage(current));
        }
    }

    /** A disk check that lands during the nightly run joins it instead of starting a second one. */
    cleanUp(reason: CleanupReason): Promise<CleanupReport> {
        this.running ??= this.prune(reason).finally(() => {
            this.running = null;
        });
        return this.running;
    }

    private async prune(reason: CleanupReason): Promise<CleanupReport> {
        const before = await this.disk.usage();
        const errors: string[] = [];
        const images = await this.step("dangling images", errors, () =>
            this.docker.pruneDanglingImages()
        );
        const keepHours = reason === "nightly" ? this.policy.buildCacheKeepHours : null;
        const buildCache = await this.step("build cache", errors, () =>
            this.docker.pruneBuildCache(keepHours)
        );
        const after = await this.disk.usage();

        const report: CleanupReport = { reason, before, after, images, buildCache, errors };
        this.logger.log(describeReport(report));
        return report;
    }

    private async step(
        name: string,
        errors: string[],
        run: () => Promise<PruneResult>
    ): Promise<PruneResult | null> {
        try {
            return await run();
        } catch (error) {
            const message = `${name}: ${errorText(error)}`;
            this.logger.error(message);
            errors.push(message);
            return null;
        }
    }
}
