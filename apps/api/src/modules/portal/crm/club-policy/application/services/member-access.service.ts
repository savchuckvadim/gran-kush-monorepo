import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import type { ProductAudience } from "@prisma/client";

import {
    isSubscriptionOpen,
    subscriptionAccess,
} from "@modules/billing/domain/subscription-access";
import {
    AUDIENCE_FIELD_KEYS,
    audiencesFromFlags,
} from "@modules/portal/crm/catalog/domain/product-audience";

import { APPROVED_STATUS_KEY, ShopDenial } from "../../domain/club-policy";
import {
    ClubPolicyRepository,
    MemberShopContext,
} from "../../domain/repositories/club-policy-repository.interface";

import { ClubPolicyService } from "./club-policy.service";

/** What the member may do in the cabinet's shop and, if not, why. */
export interface ShopAccess {
    canBrowse: boolean;
    canOrder: boolean;
    /** Reasons the shop is closed; empty when everything is open. */
    reasons: ShopDenial[];
}

const DENIAL_MESSAGES: Record<ShopDenial, string> = {
    [ShopDenial.not_in_club]: "The club's catalog opens while you are in the club",
    [ShopDenial.not_approved]: "Ordering opens once the club approves your membership",
    [ShopDenial.club_subscription_inactive]: "The club does not take orders right now",
};

/**
 * Who may browse the catalog and order from the cabinet, by the club's rules (`ClubPolicy`).
 *
 * - The catalog is hidden outside the club unless the club opened it (`catalogOutsideClub`):
 *   «outside» means no open visit.
 * - Ordering also needs an approved member when the club asks for it (`ordersRequireApproval`)
 *   and a working subscription of the club.
 *
 * The membership itself (consent confirmed, active) is checked earlier by `MembershipGuard`.
 * Staff orders in the CRM keep their own rules; only an order for oneself is checked here.
 */
@Injectable()
export class MemberAccessService {
    constructor(
        private readonly repository: ClubPolicyRepository,
        private readonly policies: ClubPolicyService
    ) {}

    async evaluate(memberId: string, portalId: string): Promise<ShopAccess> {
        const context = await this.repository.loadShopContext(memberId, portalId);
        if (!context) {
            throw new NotFoundException("Membership not found");
        }
        return MemberAccessService.decide(context);
    }

    /** The rules alone, without I/O: what a given context allows. */
    static decide(context: MemberShopContext): ShopAccess {
        const reasons: ShopDenial[] = [];
        const outside = !context.rules.catalogOutsideClub && !context.inClub;
        if (outside) reasons.push(ShopDenial.not_in_club);
        if (context.rules.ordersRequireApproval && context.statusKey !== APPROVED_STATUS_KEY) {
            reasons.push(ShopDenial.not_approved);
        }
        if (!isSubscriptionOpen(subscriptionAccess(context.subscription))) {
            reasons.push(ShopDenial.club_subscription_inactive);
        }
        return { canBrowse: !outside, canOrder: reasons.length === 0, reasons };
    }

    async assertCanBrowse(memberId: string, portalId: string): Promise<void> {
        const access = await this.evaluate(memberId, portalId);
        if (!access.canBrowse) throw this.denied(ShopDenial.not_in_club);
    }

    async assertCanOrder(memberId: string, portalId: string): Promise<void> {
        const access = await this.evaluate(memberId, portalId);
        const [first] = access.reasons;
        if (first) throw this.denied(first);
    }

    /** Audiences the club ticked for the member: which products the cabinet shows them. */
    async audiencesOf(memberId: string, portalId: string): Promise<ProductAudience[]> {
        const ticked = await this.repository.findTickedMemberFlags(
            memberId,
            portalId,
            Object.values(AUDIENCE_FIELD_KEYS)
        );
        return audiencesFromFlags(ticked);
    }

    /** An employee ordering for their own member record, unless the club allows it. */
    async assertStaffMayOrderFor(
        employeeUserId: string,
        memberId: string,
        portalId: string
    ): Promise<void> {
        const memberUserId = await this.repository.findMemberUserId(memberId, portalId);
        if (memberUserId !== employeeUserId) return;
        const rules = await this.policies.get(portalId);
        if (!rules.staffSelfOrders) {
            throw new ForbiddenException({
                message: "The club does not allow staff to place orders for themselves",
                code: "staff_self_order",
            });
        }
    }

    private denied(reason: ShopDenial): ForbiddenException {
        return new ForbiddenException({ message: DENIAL_MESSAGES[reason], code: reason });
    }
}
