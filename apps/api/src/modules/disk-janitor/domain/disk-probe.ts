import type { DiskUsage } from "./disk-usage";

export abstract class DiskProbe {
    abstract usage(): Promise<DiskUsage>;
}
