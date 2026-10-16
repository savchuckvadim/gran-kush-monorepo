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

    /** Which of `fieldKeys` are ticked (`true`) in the member's record. */
    abstract findTickedMemberFlags(
        memberId: string,
        portalId: string,
        fieldKeys: readonly string[]
    ): Promise<string[]>;

    /** The club's rules and the member's personal limit; `null` when the club has no such member. */
    abstract findMemberLimit(
        memberId: string,
        portalId: string
    ): Promise<{ rules: ClubPolicyRules; personalGrams: number | null } | null>;

    /** Sets or clears (`null`) the member's personal limit; `false` when there is no such member. */
    abstract saveMemberLimit(
        memberId: string,
        portalId: string,
        grams: number | null
    ): Promise<boolean>;

    /** Whose member record it is (the account), or `null` when the club has no such member. */
    abstract findMemberUserId(memberId: string, portalId: string): Promise<string | null>;
}
