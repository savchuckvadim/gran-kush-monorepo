import { SubscriptionStatus } from "@prisma/client";

import { subscriptionAccess } from "@modules/billing/domain/subscription-access";

import { MemberAccessService } from "../application/services/member-access.service";
import { DEFAULT_CLUB_POLICY, ShopDenial } from "../domain/club-policy";
import { MemberShopContext } from "../domain/repositories/club-policy-repository.interface";

const active = { status: SubscriptionStatus.active, graceEndsAt: null };

const context = (over: Partial<MemberShopContext> = {}): MemberShopContext => ({
    rules: DEFAULT_CLUB_POLICY,
    statusKey: "inProgress",
    inClub: true,
    subscription: active,
    ...over,
});

describe("MemberAccessService.decide — правила магазина клуба", () => {
    it("в клубе, подписка действует — открыто всё", () => {
        expect(MemberAccessService.decide(context())).toEqual({
            canBrowse: true,
            canOrder: true,
            reasons: [],
        });
    });

    it("вне клуба каталог закрыт, пока клуб не открыл его снаружи", () => {
        expect(MemberAccessService.decide(context({ inClub: false })).reasons).toEqual([
            ShopDenial.not_in_club,
        ]);
        const opened = context({
            inClub: false,
            rules: { ...DEFAULT_CLUB_POLICY, catalogOutsideClub: true },
        });
        expect(MemberAccessService.decide(opened).canOrder).toBe(true);
    });

    it("одобрение нужно только для заказа и только если клуб его требует", () => {
        const rules = { ...DEFAULT_CLUB_POLICY, ordersRequireApproval: true };
        const unapproved = MemberAccessService.decide(context({ rules }));
        expect(unapproved).toEqual({
            canBrowse: true,
            canOrder: false,
            reasons: [ShopDenial.not_approved],
        });
        expect(MemberAccessService.decide(context({ rules, statusKey: "approved" })).canOrder).toBe(
            true
        );
    });

    it("подписка клуба кончилась — заказы закрыты, каталог виден", () => {
        const expired = MemberAccessService.decide(
            context({ subscription: { status: SubscriptionStatus.expired, graceEndsAt: null } })
        );
        expect(expired).toEqual({
            canBrowse: true,
            canOrder: false,
            reasons: [ShopDenial.club_subscription_inactive],
        });
    });
});

describe("subscriptionAccess", () => {
    const now = new Date("2026-10-16T12:00:00Z");

    it.each([
        ["нет подписки", null, "missing"],
        ["active", active, "ok"],
        ["trialing", { status: SubscriptionStatus.trialing, graceEndsAt: null }, "ok"],
        ["expired", { status: SubscriptionStatus.expired, graceEndsAt: null }, "inactive"],
        ["canceled", { status: SubscriptionStatus.canceled, graceEndsAt: null }, "inactive"],
        [
            "past_due в льготном периоде",
            { status: SubscriptionStatus.past_due, graceEndsAt: new Date("2026-10-20") },
            "grace",
        ],
        [
            "past_due после льготного периода",
            { status: SubscriptionStatus.past_due, graceEndsAt: new Date("2026-10-10") },
            "grace_ended",
        ],
    ] as const)("%s → %s", (_name, subscription, expected) => {
        expect(subscriptionAccess(subscription, now)).toBe(expected);
    });
});
