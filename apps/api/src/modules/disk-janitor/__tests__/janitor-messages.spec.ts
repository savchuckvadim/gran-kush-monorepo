import {
    describeReport,
    escapeMarkdown,
    formatGigabytes,
    pressureAlertMessage,
} from "../application/janitor-messages";
import type { CleanupReport } from "../domain/cleanup-report";
import { usedPercent } from "../domain/disk-usage";

const GIB = 1024 ** 3;

describe("janitor messages", () => {
    it("formats sizes the Russian way", () => {
        expect(formatGigabytes(1.5 * GIB)).toBe("1,5 ГБ");
        expect(formatGigabytes(0)).toBe("0,0 ГБ");
    });

    it("escapes Markdown in free text from errors", () => {
        expect(escapeMarkdown("docker_engine *x* `y` [z]")).toBe(
            "docker\\_engine \\*x\\* \\`y\\` \\[z]"
        );
    });

    it("rounds disk usage up like df, without floating point surprises", () => {
        expect(usedPercent({ usedBytes: 7 * GIB, availableBytes: 93 * GIB })).toBe(7);
        expect(usedPercent({ usedBytes: 84.1 * GIB, availableBytes: 15.9 * GIB })).toBe(85);
        expect(usedPercent({ usedBytes: 0, availableBytes: 0 })).toBe(0);
    });

    it("tells apart an alert after a cleanup from one inside the cooldown", () => {
        const usage = { usedBytes: 91 * GIB, availableBytes: 9 * GIB };
        const report: CleanupReport = {
            reason: "disk-pressure",
            before: { usedBytes: 92 * GIB, availableBytes: 8 * GIB },
            after: usage,
            images: { removed: 1, reclaimedBytes: GIB },
            buildCache: { removed: 0, reclaimedBytes: 0 },
            errors: [],
        };
        expect(pressureAlertMessage(usage, report)).toContain("освободила только 1,0 ГБ");
        expect(pressureAlertMessage(usage, null)).toContain("меньше получаса назад");
    });

    it("describes a run in one log line", () => {
        const line = describeReport({
            reason: "nightly",
            before: { usedBytes: 40 * GIB, availableBytes: 60 * GIB },
            after: { usedBytes: 30 * GIB, availableBytes: 70 * GIB },
            images: { removed: 4, reclaimedBytes: 10 * GIB },
            buildCache: null,
            errors: ["build cache: boom"],
        });
        expect(line).toBe(
            "nightly cleanup: images 4, build cache failed, freed 10,0 ГБ, disk 40% -> 30%"
        );
    });
});
