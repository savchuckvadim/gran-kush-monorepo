import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import type { MemberChangedPart } from "@workspace/domain-events";

import { PrismaService } from "@common/prisma/prisma.service";
import type { NewDomainEvent } from "@modules/events";
import { DynamicPayloadValidatorService } from "@modules/portal/crm/entity-fields/application/services/dynamic-payload-validator.service";
import type { MemberWithRelations } from "@modules/portal/crm/members/domain/entity/member.entity";
import {
    MemberCrmChanges,
    MemberRepository,
} from "@modules/portal/crm/members/domain/repositories/member-repository.interface";

import { memberStatusChangedEvent, memberUpdatedEvent } from "../events/member-events";

/** Набор статусов жизненного цикла участника (`status_sets.code`) */
const MEMBER_LIFECYCLE_STATUS_SET = "member_lifecycle";

export interface MemberCrmEdit {
    fields?: Record<string, unknown>;
    statusItemId?: string;
    isActive?: boolean;
    membershipNumber?: string | null;
}

/**
 * Сотрудник правит карточку участника в CRM: анкету, статус жизненного цикла (одобрен, в клубе,
 * заблокирован…), номер и активность.
 * - статус — только из набора `member_lifecycle` этого клуба;
 * - всё изменение и его события (`member.status_changed`, `member.updated`) — одна транзакция:
 *   кабинет участника и другие сотрудники узнают о правке сразу, а не после перезагрузки.
 */
@Injectable()
export class MemberEditingService {
    constructor(
        private readonly members: MemberRepository,
        private readonly validator: DynamicPayloadValidatorService,
        private readonly prisma: PrismaService
    ) {}

    async changeStatus(
        memberId: string,
        portalId: string,
        statusItemId: string,
        employeeId: string
    ): Promise<MemberWithRelations> {
        return this.edit(memberId, portalId, { statusItemId }, employeeId);
    }

    async edit(
        memberId: string,
        portalId: string,
        edit: MemberCrmEdit,
        employeeId: string
    ): Promise<MemberWithRelations> {
        const member = await this.members.findByIdForPortal(memberId, portalId);
        if (!member) {
            throw new NotFoundException("Member not found");
        }

        const changes: MemberCrmChanges = {};
        if (edit.fields && Object.keys(edit.fields).length > 0) {
            changes.fields = await this.validator.validateMemberPartialUpdate(
                portalId,
                edit.fields
            );
        }
        if (edit.statusItemId !== undefined) {
            await this.assertStatusOfPortal(portalId, edit.statusItemId);
            if (edit.statusItemId !== member.profile.statusItemId) {
                changes.statusItemId = edit.statusItemId;
            }
        }
        if (edit.isActive !== undefined) changes.isActive = edit.isActive;
        if (edit.membershipNumber !== undefined) changes.membershipNumber = edit.membershipNumber;

        const events = this.eventsOf(member, changes, employeeId);
        if (events.length === 0) return member;

        const updated = await this.members.applyCrmChanges(member.id, portalId, changes, events);
        if (!updated) {
            throw new NotFoundException("Member not found");
        }
        return updated;
    }

    private eventsOf(
        member: MemberWithRelations,
        changes: MemberCrmChanges,
        employeeId: string
    ): NewDomainEvent[] {
        const events: NewDomainEvent[] = [];
        if (changes.statusItemId) {
            events.push(memberStatusChangedEvent(member, changes.statusItemId, employeeId));
        }
        const changed: MemberChangedPart[] = [];
        if (changes.fields) changed.push("fields");
        if (changes.isActive !== undefined) changed.push("isActive");
        if (changes.membershipNumber !== undefined) changed.push("membershipNumber");
        if (changed.length > 0) events.push(memberUpdatedEvent(member, changed, employeeId));
        return events;
    }

    private async assertStatusOfPortal(portalId: string, statusItemId: string): Promise<void> {
        const item = await this.prisma.statusItem.findFirst({
            where: {
                id: statusItemId,
                isActive: true,
                statusSet: { portalId, code: MEMBER_LIFECYCLE_STATUS_SET },
            },
            select: { id: true },
        });
        if (!item) {
            throw new BadRequestException("Unknown member status for this portal");
        }
    }
}
