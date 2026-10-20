import { MemberConsentStatus, MemberJoinSource } from "@prisma/client";

import type { EventsOf, NewDomainEvent } from "@modules/events";
import type { EntityListFilter } from "@modules/portal/crm/entity-fields/domain/entity-filter";
import { MemberWithRelations } from "@modules/portal/crm/members/domain/entity/member.entity";

/** `q` ищет ещё по email и номеру участника, не только по полям анкеты. */
export type MemberListFilters = EntityListFilter & {
    statusItemId?: string;
};

/** Что сотрудник меняет в карточке участника; поля анкеты проверены по схеме портала. */
export interface MemberCrmChanges {
    fields?: Record<string, unknown>;
    statusItemId?: string;
    isActive?: boolean;
    membershipNumber?: string | null;
}

export abstract class MemberRepository {
    abstract findPageByPortal(
        portalId: string,
        filters: MemberListFilters,
        take: number,
        skip: number
    ): Promise<{ items: MemberWithRelations[]; total: number }>;
    abstract findByIdForPortal(id: string, portalId: string): Promise<MemberWithRelations | null>;
    /** Без tenant-скоупа — только для внутренних сервисов (QR и т.п.) */
    abstract findByUserAndPortal(
        userId: string,
        portalId: string
    ): Promise<MemberWithRelations | null>;
    abstract findAllByUser(userId: string): Promise<MemberWithRelations[]>;
    abstract countByPortal(portalId: string): Promise<number>;
    /** Членство, которое ждёт согласия владельца аккаунта (TASK-663); хеш токена из письма. */
    abstract findByConsentToken(tokenHash: string): Promise<MemberWithRelations | null>;
    /*
     * `events` у записывающих методов пишутся в outbox той же транзакцией, что и изменение
     * (TASK-780): либо оба, либо ничего.
     */
    abstract create(
        data: {
            userId: string;
            portalId: string;
            membershipNumber?: string;
            statusItemId?: string;
            joinSource?: MemberJoinSource;
            registrationLinkId?: string;
            createdByEmployeeId?: string;
            consent?: { tokenHash: string; requestedAt: Date };
            /** Поля анкеты, уже проверенные по схеме портала: пишутся в той же транзакции */
            fields?: Record<string, unknown>;
        },
        events?: EventsOf<MemberWithRelations>
    ): Promise<MemberWithRelations>;
    abstract update(
        id: string,
        data: Partial<{
            membershipNumber: string | null;
            isActive: boolean;
            claimedAt: Date;
            consentStatus: MemberConsentStatus;
            consentToken: string | null;
            consentRequestedAt: Date | null;
            consentConfirmedAt: Date | null;
            signatureShared: boolean;
        }>,
        events?: readonly NewDomainEvent[]
    ): Promise<MemberWithRelations>;
    /**
     * Правка карточки из CRM одной транзакцией: поля анкеты (уже проверенные), статус жизненного
     * цикла, номер, активность и события. Чужой портал — null, ничего не записано.
     */
    abstract applyCrmChanges(
        id: string,
        portalId: string,
        changes: MemberCrmChanges,
        events: readonly NewDomainEvent[]
    ): Promise<MemberWithRelations | null>;
    /** Членство вместе с его записью-анкетой (владелец аккаунта отказался вступать). */
    abstract deleteWithProfile(id: string, events?: readonly NewDomainEvent[]): Promise<void>;
}
