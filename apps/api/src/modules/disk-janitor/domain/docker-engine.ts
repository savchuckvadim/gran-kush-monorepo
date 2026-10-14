export interface PruneResult {
    /** images or build cache records removed */
    removed: number;
    /** as Docker reports it; the containerd image store may report 0, the disk itself is the truth */
    reclaimedBytes: number;
}

export interface PruneScope {
    /** `key=value`: only objects carrying this label, so tests touch nothing but their own images */
    label?: string;
}

/**
 * The Docker daemon of the whole server, shared with other projects. Only garbage is removed:
 * untagged images no container uses and build cache. Tagged images, containers and volumes are
 * never touched.
 */
export abstract class DockerEngine {
    abstract ping(): Promise<void>;

    /** What every deploy leaves behind: the previous `latest` loses its tag when a new one is pulled */
    abstract pruneDanglingImages(scope?: PruneScope): Promise<PruneResult>;

    /** Build cache unused for `keepHours`; `null` removes all cache that is not in use */
    abstract pruneBuildCache(keepHours: number | null): Promise<PruneResult>;
}
