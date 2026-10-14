import { DiskJanitorService } from "../application/services/disk-janitor.service";
import type { DiskProbe } from "../domain/disk-probe";
import type { DiskUsage } from "../domain/disk-usage";
import type { DockerEngine, PruneResult } from "../domain/docker-engine";
import type { JanitorNotifier } from "../domain/janitor-notifier";
import { DEFAULT_JANITOR_POLICY } from "../domain/janitor-policy";

const GIB = 1024 ** 3;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** A 100 GiB disk filled to `percent`. */
const disk = (percent: number): DiskUsage => ({
    usedBytes: percent * GIB,
    availableBytes: (100 - percent) * GIB,
});

const pruned = (removed: number): PruneResult => ({ removed, reclaimedBytes: removed * GIB });

const setup = () => {
    const docker = {
        ping: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
        pruneDanglingImages: jest.fn<Promise<PruneResult>, []>().mockResolvedValue(pruned(3)),
        pruneBuildCache: jest
            .fn<Promise<PruneResult>, [number | null]>()
            .mockResolvedValue(pruned(0)),
    } satisfies DockerEngine;
    const probe = { usage: jest.fn<Promise<DiskUsage>, []>() } satisfies DiskProbe;
    const notifier = {
        notify: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
    } satisfies JanitorNotifier;
    const service = new DiskJanitorService(docker, probe, notifier, DEFAULT_JANITOR_POLICY);
    /** The probe answers in order; the last value repeats. */
    const diskReads = (...percents: number[]) => {
        probe.usage.mockReset();
        percents.forEach((percent) => probe.usage.mockResolvedValueOnce(disk(percent)));
        probe.usage.mockResolvedValue(disk(percents[percents.length - 1] ?? 0));
    };
    const messages = () => notifier.notify.mock.calls.map(([text]) => text);
    return { docker, probe, notifier, service, diskReads, messages };
};

describe("DiskJanitorService", () => {
    afterEach(() => jest.useRealTimers());

    describe("nightly cleanup", () => {
        it("removes dangling images and build cache older than a day, then reports what it freed", async () => {
            const { docker, service, diskReads, messages } = setup();
            diskReads(60, 40);

            const report = await service.runNightly();

            expect(docker.pruneDanglingImages).toHaveBeenCalledTimes(1);
            expect(docker.pruneBuildCache).toHaveBeenCalledWith(24);
            expect(report.errors).toEqual([]);
            expect(messages()).toHaveLength(1);
            expect(messages()[0]).toContain("Освобождено 20,0 ГБ");
            expect(messages()[0]).toContain("60% → 40%, свободно 60,0 ГБ");
        });

        it("stays silent when it freed less than a gigabyte", async () => {
            const { service, diskReads, notifier } = setup();
            diskReads(30, 30);

            await service.runNightly();

            expect(notifier.notify).not.toHaveBeenCalled();
        });

        it("runs the build cache step after a failed image step and reports the failure", async () => {
            const { docker, service, diskReads, messages } = setup();
            docker.pruneDanglingImages.mockRejectedValue(
                new Error("a prune operation is already running")
            );
            diskReads(50, 49);

            const report = await service.runNightly();

            expect(docker.pruneBuildCache).toHaveBeenCalled();
            expect(report.images).toBeNull();
            expect(report.errors).toEqual([
                "dangling images: a prune operation is already running",
            ]);
            expect(messages()[0]).toContain("с ошибками");
            expect(messages()[0]).toContain(
                "dangling images: a prune operation is already running"
            );
        });
    });

    describe("disk checks", () => {
        it("does nothing while the disk is under the threshold", async () => {
            const { docker, service, diskReads, notifier } = setup();
            diskReads(84);

            await service.checkDiskPressure();

            expect(docker.pruneDanglingImages).not.toHaveBeenCalled();
            expect(notifier.notify).not.toHaveBeenCalled();
        });

        it("cleans a full disk right away, removing all unused build cache, and sends one message when that helps", async () => {
            const { docker, service, diskReads, messages } = setup();
            diskReads(90, 90, 60);

            await service.checkDiskPressure();

            expect(docker.pruneBuildCache).toHaveBeenCalledWith(null);
            expect(messages()).toHaveLength(1);
            expect(messages()[0]).toContain("дошёл до 90%");
            expect(messages()[0]).toContain("освободила 30,0 ГБ, теперь 60%");

            diskReads(60);
            await service.checkDiskPressure();
            expect(messages()).toHaveLength(1);
        });

        it("raises an alert when the cleanup cannot help, reminds every 6 hours and says when the disk recovers", async () => {
            jest.useFakeTimers({ now: new Date("2026-10-14T10:00:00Z") });
            const { docker, service, diskReads, messages } = setup();

            diskReads(92, 92, 91);
            await service.checkDiskPressure();
            expect(messages()).toHaveLength(1);
            expect(messages()[0]).toContain("🚨 Диск сервера заполнен на 91%");
            expect(messages()[0]).toContain("освободила только 1,0 ГБ");

            // inside the cooldown: no second cleanup, the alert is already out
            jest.advanceTimersByTime(10 * MINUTE);
            diskReads(91);
            await service.checkDiskPressure();
            expect(docker.pruneDanglingImages).toHaveBeenCalledTimes(1);
            expect(messages()).toHaveLength(1);

            // the cooldown has passed: another cleanup, but no repeated alert yet
            jest.advanceTimersByTime(30 * MINUTE);
            diskReads(91);
            await service.checkDiskPressure();
            expect(docker.pruneDanglingImages).toHaveBeenCalledTimes(2);
            expect(messages()).toHaveLength(1);

            jest.advanceTimersByTime(6 * HOUR);
            diskReads(91);
            await service.checkDiskPressure();
            expect(messages()).toHaveLength(2);
            expect(messages()[1]).toContain("всё ещё заполнен на 91%");

            // below the threshold but within the margin: the alert stays open
            diskReads(83);
            await service.checkDiskPressure();
            expect(messages()).toHaveLength(2);

            diskReads(79);
            await service.checkDiskPressure();
            expect(messages()).toHaveLength(3);
            expect(messages()[2]).toContain("снова в норме: 79%");
        });

        it("joins a nightly run in progress instead of starting a second cleanup", async () => {
            const { docker, service, diskReads } = setup();
            diskReads(90);
            let finishImages: (result: PruneResult) => void = () => undefined;
            docker.pruneDanglingImages.mockImplementation(
                () => new Promise<PruneResult>((resolve) => (finishImages = resolve))
            );

            const nightly = service.runNightly();
            const check = service.checkDiskPressure();
            await new Promise((resolve) => setImmediate(resolve));
            finishImages(pruned(1));
            await Promise.all([nightly, check]);

            expect(docker.pruneDanglingImages).toHaveBeenCalledTimes(1);
        });
    });

    describe("self-check", () => {
        it("passes quietly when Docker answers", async () => {
            const { service, diskReads, notifier } = setup();
            diskReads(26);

            await expect(service.selfCheck()).resolves.toBe(true);
            expect(notifier.notify).not.toHaveBeenCalled();
        });

        it("reports a Docker socket it cannot reach", async () => {
            const { docker, service, diskReads, messages } = setup();
            docker.ping.mockRejectedValue(new Error("connect ENOENT /var/run/docker.sock"));
            diskReads(26);

            await expect(service.selfCheck()).resolves.toBe(false);
            expect(messages()[0]).toContain("не видит Docker: connect ENOENT /var/run/docker.sock");
        });
    });
});
