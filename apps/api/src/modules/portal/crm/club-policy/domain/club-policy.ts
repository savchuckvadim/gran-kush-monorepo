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
}

/** Owner decisions 2026-10-16: join only by link, catalog hidden outside the club, no self-orders. */
export const DEFAULT_CLUB_POLICY: ClubPolicyRules = {
    joinPolicy: ClubJoinPolicy.link_only,
    catalogOutsideClub: false,
    ordersRequireApproval: false,
    staffSelfOrders: false,
};

/** Why the cabinet's catalog or ordering is closed for a member; the UI explains each one. */
export enum ShopDenial {
    not_in_club = "not_in_club",
    not_approved = "not_approved",
    club_subscription_inactive = "club_subscription_inactive",
}

/** Lifecycle status that makes a member «approved» (member_lifecycle template). */
export const APPROVED_STATUS_KEY = "approved";
