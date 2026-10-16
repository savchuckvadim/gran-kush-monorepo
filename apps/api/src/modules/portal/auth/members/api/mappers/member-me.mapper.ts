import { MemberConsentStatus } from "@prisma/client";
import { UserWithMemberships } from "@users/domain/entity/user.entity";

import { MemberMeResponseDto } from "../dto/member-me-response.dto";

/** The cabinet account (web and native): memberships by club and whether it also works in a club. */
export const toMemberMe = (user: UserWithMemberships): MemberMeResponseDto => ({
    id: user.id,
    email: user.email,
    emailConfirmed: user.emailConfirmed,
    memberships: user.members.map((m) => ({
        portalId: m.portalId,
        memberId: m.id,
        membershipNumber: m.membershipNumber,
        isActive: m.isActive,
        consentStatus: m.consentStatus ?? MemberConsentStatus.confirmed,
    })),
    hasEmployments: user.employees.some((e) => e.isActive),
});
