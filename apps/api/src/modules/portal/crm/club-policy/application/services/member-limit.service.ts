import { Injectable, NotFoundException } from "@nestjs/common";

import { effectiveMonthlyLimit } from "../../domain/club-policy";
import { ClubPolicyRepository } from "../../domain/repositories/club-policy-repository.interface";

/** The member's dispensing limit as the club configured it; usage is counted by the orders. */
export interface MemberLimitSettings {
    enabled: boolean;
    personalGrams: number | null;
    /** Personal, else the club's default; `null` — no limit. */
    limitGrams: number | null;
}

/** Limits of the club's members (decision 3): the club switches them on, staff set personal ones. */
@Injectable()
export class MemberLimitService {
    constructor(private readonly repository: ClubPolicyRepository) {}

    async settingsOf(memberId: string, portalId: string): Promise<MemberLimitSettings> {
        const found = await this.repository.findMemberLimit(memberId, portalId);
        if (!found) {
            throw new NotFoundException("Member not found");
        }
        return {
            enabled: found.rules.monthlyLimitEnabled,
            personalGrams: found.personalGrams,
            limitGrams: effectiveMonthlyLimit(found.rules, found.personalGrams),
        };
    }

    /** Sets or clears (`null`, back to the club's default) the member's personal limit. */
    async setPersonal(memberId: string, portalId: string, grams: number | null): Promise<void> {
        const saved = await this.repository.saveMemberLimit(memberId, portalId, grams);
        if (!saved) {
            throw new NotFoundException("Member not found");
        }
    }
}
