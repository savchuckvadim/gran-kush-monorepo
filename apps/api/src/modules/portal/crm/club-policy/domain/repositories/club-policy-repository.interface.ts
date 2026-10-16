import { SubscriptionStatus } from "@prisma/client";

import { ClubPolicyRules } from "../club-policy";

/** What decides a member's access to the shop, read in one go. */
export interface MemberShopContext {
    rules: ClubPolicyRules;
    /** Lifecycle status key of the member record (`approved`, `inProgress`, …), if any. */
    statusKey: string | null;
    /** The member has an open visit (entered and not left). */
    inClub: boolean;
    subscription: { status: SubscriptionStatus; graceEndsAt: Date | null } | null;
}

export abstract class ClubPolicyRepository {
    /** The saved rules of the club, or `null` when it works by the defaults. */
    abstract findRules(portalId: string): Promise<ClubPolicyRules | null>;

    abstract saveRules(portalId: string, rules: ClubPolicyRules): Promise<ClubPolicyRules>;

    abstract loadShopContext(memberId: string, portalId: string): Promise<MemberShopContext | null>;

    /** Whose member record it is (the account), or `null` when the club has no such member. */
    abstract findMemberUserId(memberId: string, portalId: string): Promise<string | null>;
}
