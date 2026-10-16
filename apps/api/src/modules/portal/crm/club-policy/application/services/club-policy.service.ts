import { Injectable } from "@nestjs/common";

import { ClubPolicyRules, DEFAULT_CLUB_POLICY } from "../../domain/club-policy";
import { ClubPolicyRepository } from "../../domain/repositories/club-policy-repository.interface";

/** The club's rules: saved ones or the defaults; a change keeps the fields it does not name. */
@Injectable()
export class ClubPolicyService {
    constructor(private readonly repository: ClubPolicyRepository) {}

    async get(portalId: string): Promise<ClubPolicyRules> {
        return (await this.repository.findRules(portalId)) ?? DEFAULT_CLUB_POLICY;
    }

    async update(portalId: string, patch: Partial<ClubPolicyRules>): Promise<ClubPolicyRules> {
        const current = await this.get(portalId);
        return this.repository.saveRules(portalId, { ...current, ...patch });
    }
}
