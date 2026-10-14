import { statfs } from "node:fs/promises";

import { DiskProbe } from "../domain/disk-probe";
import type { DiskUsage } from "../domain/disk-usage";

/**
 * Inside the container `/` is an overlay on top of the host's /var/lib/docker, so statfs on it
 * shows the server disk itself: no host mount is needed.
 */
export class HostDiskProbe extends DiskProbe {
    constructor(private readonly path: string) {
        super();
    }

    async usage(): Promise<DiskUsage> {
        const stats = await statfs(this.path);
        return {
            usedBytes: (stats.blocks - stats.bfree) * stats.bsize,
            availableBytes: stats.bavail * stats.bsize,
        };
    }
}
