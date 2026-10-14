/** How full the server disk is, the way `df` counts it. */
export interface DiskUsage {
    usedBytes: number;
    /** free space an ordinary process can still take */
    availableBytes: number;
}

/** Rounded up, like `df`: 84.1 % already shows as 85 %. */
export const usedPercent = ({ usedBytes, availableBytes }: DiskUsage): number => {
    const total = usedBytes + availableBytes;
    // multiply first: 7 / 100 * 100 is 7.000000000000001 in floating point and would round up to 8
    return total > 0 ? Math.ceil((usedBytes * 100) / total) : 0;
};

export const freedBytes = (before: DiskUsage, after: DiskUsage): number =>
    Math.max(0, before.usedBytes - after.usedBytes);
