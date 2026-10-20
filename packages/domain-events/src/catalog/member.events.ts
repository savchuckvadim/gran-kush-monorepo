import { z } from "zod";

import { defineEvent } from "../define-event";

const STAFF = { permission: "members.read" } as const;

export const memberJoined = defineEvent({
    name: "member.joined",
    version: 1,
    scope: "portal",
    aggregate: "member",
    payload: z.object({
        memberId: z.string().min(1),
        userId: z.string().min(1),
        joinSource: z.string().min(1),
        statusItemId: z.string().min(1).nullable(),
        consentStatus: z.string().min(1),
    }),
    audience: { staff: STAFF, user: { by: "userId" } },
    publicPayload: ["memberId", "statusItemId", "consentStatus"],
    description: "A membership was created: by the club, by a registration link or by the person",
});

export const memberConsentGiven = defineEvent({
    name: "member.consent_given",
    version: 1,
    scope: "portal",
    aggregate: "member",
    payload: z.object({
        memberId: z.string().min(1),
        userId: z.string().min(1),
    }),
    audience: { staff: STAFF, user: { by: "userId" } },
    publicPayload: ["memberId"],
    description: "The person confirmed the membership the club created for them",
});

export const memberLeft = defineEvent({
    name: "member.left",
    version: 1,
    scope: "portal",
    aggregate: "member",
    payload: z.object({
        memberId: z.string().min(1),
        userId: z.string().min(1),
        reason: z.enum(["declined", "left"]),
    }),
    audience: { staff: STAFF, user: { by: "userId" } },
    publicPayload: ["memberId", "reason"],
    description: "The person declined the membership or left the club",
});

export const memberStatusChanged = defineEvent({
    name: "member.status_changed",
    version: 1,
    scope: "portal",
    aggregate: "member",
    payload: z.object({
        memberId: z.string().min(1),
        userId: z.string().min(1),
        fromStatusItemId: z.string().min(1).nullable(),
        toStatusItemId: z.string().min(1),
    }),
    audience: { staff: STAFF, member: { by: "memberId" } },
    publicPayload: ["memberId", "toStatusItemId"],
    description: "The club changed the lifecycle status of a member (approved, in club, blocked…)",
});

/** What staff changed on the member card; the values themselves are read with rights. */
export const MEMBER_CHANGED_PARTS = ["fields", "isActive", "membershipNumber"] as const;

export const memberUpdated = defineEvent({
    name: "member.updated",
    version: 1,
    scope: "portal",
    aggregate: "member",
    payload: z.object({
        memberId: z.string().min(1),
        userId: z.string().min(1),
        changed: z.array(z.enum(MEMBER_CHANGED_PARTS)).min(1),
    }),
    audience: { staff: STAFF, member: { by: "memberId" } },
    publicPayload: ["memberId", "changed"],
    description: "Staff edited the member card: profile fields, membership number or activity",
});

export type MemberChangedPart = (typeof MEMBER_CHANGED_PARTS)[number];
