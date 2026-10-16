import { ClubJoinPolicy } from "@prisma/client";

/** A club's rules for its members. A club that never saved them works by the defaults below. */
export interface ClubPolicyRules {
    /** How someone gets in without staff: only by the club's link, or by a request the club approves. */
    joinPolicy: ClubJoinPolicy;
    /** The catalog and ordering from the cabinet also work when the member is not in the club. */
    catalogOutsideClub: boolean;
    /** Ordering from the cabinet needs the member to be approved (lifecycle status `approved`). */
    ordersRequireApproval: boolean;
    /** An employee may place an order for their own member record. */
    staffSelfOrders: boolean;
    /** Members may be given a dispensing limit in grams over the last 30 days. */
    monthlyLimitEnabled: boolean;
    /** The limit of members without a personal one; `null` — no limit by default. */
    defaultMonthlyLimitGrams: number | null;
}

/** Owner decisions 2026-10-16: join only by link, catalog hidden outside the club, no self-orders. */
export const DEFAULT_CLUB_POLICY: ClubPolicyRules = {
    joinPolicy: ClubJoinPolicy.link_only,
    catalogOutsideClub: false,
    ordersRequireApproval: false,
    staffSelfOrders: false,
    monthlyLimitEnabled: false,
    defaultMonthlyLimitGrams: null,
};

/**
 * The member's limit for the last 30 days: their personal one, else the club's default; `null` — no
 * limit (the club has limits off, or neither is set). Decision 3 (2026-10-16): a club setting.
 */
export const effectiveMonthlyLimit = (
    rules: Pick<ClubPolicyRules, "monthlyLimitEnabled" | "defaultMonthlyLimitGrams">,
    personalGrams: number | null
): number | null =>
    rules.monthlyLimitEnabled ? (personalGrams ?? rules.defaultMonthlyLimitGrams) : null;

/** Why the cabinet's catalog or ordering is closed for a member; the UI explains each one. */
export enum ShopDenial {
    not_in_club = "not_in_club",
    not_approved = "not_approved",
    club_subscription_inactive = "club_subscription_inactive",
}

/** Limits are stored as DECIMAL(10, 3): a larger value does not fit the column. */
export const MAX_LIMIT_GRAMS = 9_999_999;

/** Lifecycle status that makes a member «approved» (member_lifecycle template). */
export const APPROVED_STATUS_KEY = "approved";
