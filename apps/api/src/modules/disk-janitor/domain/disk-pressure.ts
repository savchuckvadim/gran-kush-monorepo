import type { JanitorPolicy } from "./janitor-policy";

/** Memory of the disk checks between runs; lives in the janitor process. */
export interface DiskPressureState {
    /** When the last alert went out; `null` — no open alert */
    alertedAt: number | null;
    lastCleanupAt: number | null;
}

export const NO_PRESSURE: DiskPressureState = { alertedAt: null, lastCleanupAt: null };

export const isUnderPressure = (percent: number, policy: JanitorPolicy): boolean =>
    percent >= policy.alertPercent;

export const hasRecovered = (percent: number, policy: JanitorPolicy): boolean =>
    percent <= policy.alertPercent - policy.recoverMarginPercent;

export const canCleanUp = (state: DiskPressureState, now: number, policy: JanitorPolicy): boolean =>
    state.lastCleanupAt === null || now - state.lastCleanupAt >= policy.cleanupCooldownMs;

export const isReminderDue = (
    state: DiskPressureState,
    now: number,
    policy: JanitorPolicy
): boolean => state.alertedAt !== null && now - state.alertedAt >= policy.remindEveryMs;
