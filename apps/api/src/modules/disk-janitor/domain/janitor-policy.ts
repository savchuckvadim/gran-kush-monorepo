const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export abstract class JanitorPolicy {
    /** Disk usage that triggers an extra cleanup and, if it does not help, an alert */
    abstract readonly alertPercent: number;
    /** An open alert closes once the disk is this many points below the threshold */
    abstract readonly recoverMarginPercent: number;
    /** Pause between cleanups caused by a full disk */
    abstract readonly cleanupCooldownMs: number;
    /** How often to repeat an alert while the disk stays full */
    abstract readonly remindEveryMs: number;
    /** The nightly cleanup keeps build cache used within this many hours */
    abstract readonly buildCacheKeepHours: number;
    /** The nightly cleanup reports to Telegram only when it freed at least this much */
    abstract readonly reportMinFreedBytes: number;
}

export const DEFAULT_JANITOR_POLICY: JanitorPolicy = {
    alertPercent: 85,
    recoverMarginPercent: 5,
    cleanupCooldownMs: 30 * MINUTE,
    remindEveryMs: 6 * HOUR,
    buildCacheKeepHours: 24,
    reportMinFreedBytes: 1024 ** 3,
};
