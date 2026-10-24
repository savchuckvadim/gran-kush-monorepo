import "server-only";

export const LEAD_RATE_LIMIT = {
    /** Requests one address may send inside the window. */
    max: 5,
    windowMs: 10 * 60 * 1000,
} as const;

const hits = new Map<string, number[]>();

/**
 * Sliding window per client address, in process memory: the site runs as one container and a
 * restart forgetting the counters costs nothing. Returns false when the address is over the limit.
 */
export const allowLead = (ip: string, now = Date.now()): boolean => {
    const since = now - LEAD_RATE_LIMIT.windowMs;
    const recent = (hits.get(ip) ?? []).filter((at) => at > since);
    if (recent.length >= LEAD_RATE_LIMIT.max) {
        hits.set(ip, recent);
        return false;
    }
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 10_000) {
        for (const [key, stamps] of hits) {
            if (stamps.every((at) => at <= since)) hits.delete(key);
        }
    }
    return true;
};
