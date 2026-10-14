import { DiskJanitorCron } from "../api/disk-janitor.cron";
import type { DiskJanitorService } from "../application/services/disk-janitor.service";
import type { JanitorNotifier } from "../domain/janitor-notifier";
import { DEFAULT_JANITOR_POLICY } from "../domain/janitor-policy";

const HOUR = 3_600_000;

const setup = () => {
    const janitor = {
        selfCheck: jest.fn<Promise<boolean>, []>().mockResolvedValue(true),
        runNightly: jest.fn(),
        checkDiskPressure: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    };
    const notifier = {
        notify: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
    } satisfies JanitorNotifier;
    const service: Pick<DiskJanitorService, "selfCheck" | "runNightly" | "checkDiskPressure"> =
        janitor;
    // the cron only calls these three methods
    const cron = new DiskJanitorCron(
        service as DiskJanitorService,
        notifier,
        DEFAULT_JANITOR_POLICY
    );
    return { cron, janitor, notifier };
};

describe("DiskJanitorCron", () => {
    afterEach(() => jest.useRealTimers());

    it("checks Docker and the disk as soon as the process starts", async () => {
        const { cron, janitor } = setup();
        await cron.onApplicationBootstrap();
        expect(janitor.selfCheck).toHaveBeenCalledTimes(1);
    });

    it("keeps running after a failed job and reports the same failure at most every 6 hours", async () => {
        jest.useFakeTimers({ now: new Date("2026-10-14T10:00:00Z") });
        const { cron, janitor, notifier } = setup();
        janitor.checkDiskPressure.mockRejectedValue(new Error("EACCES: statfs /"));

        await expect(cron.checkDisk()).resolves.toBeUndefined();
        await cron.checkDisk();
        expect(notifier.notify).toHaveBeenCalledTimes(1);
        expect(notifier.notify.mock.calls[0]?.[0]).toContain("проверка диска: EACCES: statfs /");

        jest.advanceTimersByTime(6 * HOUR);
        await cron.checkDisk();
        expect(notifier.notify).toHaveBeenCalledTimes(2);
    });
});
