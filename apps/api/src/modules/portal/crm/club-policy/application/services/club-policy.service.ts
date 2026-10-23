import { Injectable } from "@nestjs/common";

import { BrandService } from "@common/brand/brand.service";

import { ClubPolicyRules, DEFAULT_CLUB_POLICY, NO_CLUB_POLICY } from "../../domain/club-policy";
import { ClubPolicyRepository } from "../../domain/repositories/club-policy-repository.interface";

/**
 * The club's rules: saved ones or the defaults; a change keeps the fields it does not name. An
 * installation without `club-policy` has no club rules: `NO_CLUB_POLICY`.
 */
@Injectable()
export class ClubPolicyService {
    constructor(
        private readonly repository: ClubPolicyRepository,
        private readonly brand: BrandService
    ) {}

    async get(portalId: string): Promise<ClubPolicyRules> {
        if (!this.brand.has("club-policy")) return NO_CLUB_POLICY;
        return (await this.repository.findRules(portalId)) ?? DEFAULT_CLUB_POLICY;
    }

    async update(portalId: string, patch: Partial<ClubPolicyRules>): Promise<ClubPolicyRules> {
        const current = await this.get(portalId);
        return this.repository.saveRules(portalId, { ...current, ...patch });
    }
}
