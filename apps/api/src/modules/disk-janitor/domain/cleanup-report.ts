import type { DiskUsage } from "./disk-usage";
import type { PruneResult } from "./docker-engine";

/** `nightly` keeps the last day of build cache; `disk-pressure` removes everything not in use */
export type CleanupReason = "nightly" | "disk-pressure";

export interface CleanupReport {
    reason: CleanupReason;
    before: DiskUsage;
    after: DiskUsage;
    /** `null` — the step failed, see `errors` */
    images: PruneResult | null;
    buildCache: PruneResult | null;
    /** A failed step does not stop the next one */
    errors: string[];
}
