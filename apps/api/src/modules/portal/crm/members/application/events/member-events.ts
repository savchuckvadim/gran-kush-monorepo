import type { MemberChangedPart } from "@workspace/domain-events";

import { employeeActor, memberActor, type NewDomainEvent, userActor } from "@modules/events";
import type { MemberWithRelations } from "@modules/portal/crm/members/domain/entity/member.entity";

/*
 * События участника (каталог: packages/domain-events/src/catalog/member.events.ts). В payload
 * только идентификаторы и статусы: анкета и документы читаются запросом по правам.
 */

/** Членство создано: сотрудником CRM, по ссылке регистрации или самим человеком. */
export const memberJoinedEvent = (member: MemberWithRelations): NewDomainEvent => ({
    name: "member.joined",
    portalId: member.portalId,
    actor: member.createdByEmployeeId
        ? employeeActor(member.createdByEmployeeId)
        : userActor(member.userId),
    aggregateId: member.id,
    payload: {
        memberId: member.id,
        userId: member.userId,
        joinSource: member.joinSource,
        statusItemId: member.profile.statusItemId,
        consentStatus: member.consentStatus,
    },
});

export const memberStatusChangedEvent = (
    member: MemberWithRelations,
    toStatusItemId: string,
    employeeId: string
): NewDomainEvent => ({
    name: "member.status_changed",
    portalId: member.portalId,
    actor: employeeActor(employeeId),
    aggregateId: member.id,
    payload: {
        memberId: member.id,
        userId: member.userId,
        fromStatusItemId: member.profile.statusItemId,
        toStatusItemId,
    },
});

export const memberConsentGivenEvent = (member: MemberWithRelations): NewDomainEvent => ({
    name: "member.consent_given",
    portalId: member.portalId,
    actor: memberActor(member.id),
    aggregateId: member.id,
    payload: { memberId: member.id, userId: member.userId },
});

export const memberLeftEvent = (
    member: MemberWithRelations,
    reason: "declined" | "left"
): NewDomainEvent => ({
    name: "member.left",
    portalId: member.portalId,
    actor: userActor(member.userId),
    aggregateId: member.id,
    payload: { memberId: member.id, userId: member.userId, reason },
});

export const memberUpdatedEvent = (
    member: MemberWithRelations,
    changed: MemberChangedPart[],
    employeeId: string
): NewDomainEvent => ({
    name: "member.updated",
    portalId: member.portalId,
    actor: employeeActor(employeeId),
    aggregateId: member.id,
    payload: { memberId: member.id, userId: member.userId, changed },
});
