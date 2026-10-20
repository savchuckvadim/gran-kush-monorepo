import { Injectable } from "@nestjs/common";

import type { DomainEvent as DomainEventRow, Prisma } from "@prisma/client";
import type { EventName } from "@workspace/domain-events";

import { PrismaService } from "@common/prisma/prisma.service";

import {
    type TimelineComment,
    type TimelineCursor,
    type TimelineEvent,
    type TimelineSubject,
    type TimelineSubjectKind,
} from "../domain/timeline";
import {
    type CommentQuery,
    type EventQuery,
    TimelineRepository,
} from "../domain/timeline-repository.interface";

import { PERSON_NAME_SELECT } from "./staff-names";
import { type CommentRow, toTimelineComment } from "./timeline-comment.mapper";
import { subjectKey, TimelineHydrator } from "./timeline-hydrator";

/** Поля payload со стадией заказа и статусом участника: им нужны подписи клуба. */
const STAGE_FIELDS = ["stageId", "fromStageId", "toStageId"] as const;
const STATUS_FIELDS = ["statusItemId", "fromStatusItemId", "toStatusItemId"] as const;

const payloadOf = (row: DomainEventRow): Record<string, unknown> =>
    row.payload !== null && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {};

const idsOf = (payloads: Record<string, unknown>[], fields: readonly string[]): string[] => [
    ...new Set(
        payloads.flatMap((payload) =>
            fields.map((field) => payload[field]).filter((v): v is string => typeof v === "string")
        )
    ),
];

/** Участник — события, где он в payload; остальные сущности — события своего агрегата. */
const eventsOfSubject = (subject: TimelineSubject): Prisma.DomainEventWhereInput => {
    if (subject.kind === "portal") return {};
    if (subject.kind === "member") return { payload: { path: ["memberId"], equals: subject.id } };
    return { aggregateKind: subject.kind, aggregateId: subject.id };
};

/** О ком событие в ленте: заказ, участник из payload, сотрудник или товар своего агрегата. */
const subjectOfEvent = (
    row: DomainEventRow,
    payload: Record<string, unknown>
): { kind: TimelineSubjectKind; id: string } | null => {
    if (row.aggregateKind === "order") return { kind: "order", id: row.aggregateId };
    if (typeof payload.memberId === "string") return { kind: "member", id: payload.memberId };
    if (row.aggregateKind === "employee" || row.aggregateKind === "product") {
        return { kind: row.aggregateKind, id: row.aggregateId };
    }
    return null;
};

const commentInclude = { author: { select: PERSON_NAME_SELECT } } as const;

@Injectable()
export class TimelinePrismaRepository extends TimelineRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hydrator: TimelineHydrator
    ) {
        super();
    }

    async subjectExists(portalId: string, subject: TimelineSubject): Promise<boolean> {
        const where = { id: subject.id, portalId };
        switch (subject.kind) {
            case "member":
                return (await this.prisma.member.count({ where })) > 0;
            case "order":
                return (await this.prisma.order.count({ where })) > 0;
            case "employee":
                return (await this.prisma.employee.count({ where })) > 0;
            case "product":
                return (await this.prisma.product.count({ where })) > 0;
            case "portal":
                return subject.id === portalId;
        }
    }

    async events(
        portalId: string,
        subject: TimelineSubject,
        query: EventQuery,
        before: TimelineCursor | null,
        limit: number
    ): Promise<TimelineEvent[]> {
        if (!query.names.length) return [];
        const rows = await this.prisma.domainEvent.findMany({
            where: {
                portalId,
                name: { in: [...query.names] },
                ...eventsOfSubject(subject),
                ...(query.authorEmployeeId
                    ? { actorKind: "employee", actorId: query.authorEmployeeId }
                    : {}),
                ...(before
                    ? {
                          OR: [
                              { occurredAt: { lt: before.at } },
                              { occurredAt: before.at, id: { lt: before.id } },
                          ],
                      }
                    : {}),
            },
            orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
            take: limit,
        });
        return this.hydrateEvents(portalId, rows, subject.kind === "portal");
    }

    async comments(
        portalId: string,
        subject: TimelineSubject,
        query: CommentQuery,
        before: TimelineCursor | null,
        limit: number
    ): Promise<TimelineComment[]> {
        const rows = await this.prisma.entityComment.findMany({
            where: {
                portalId,
                ...(subject.kind === "portal"
                    ? { subjectKind: { in: [...query.subjectKinds] } }
                    : { subjectKind: subject.kind, subjectId: subject.id }),
                ...(query.authorEmployeeId ? { authorEmployeeId: query.authorEmployeeId } : {}),
                ...(before
                    ? {
                          OR: [
                              { createdAt: { lt: before.at } },
                              { createdAt: before.at, id: { lt: before.id } },
                          ],
                      }
                    : {}),
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: limit,
            include: commentInclude,
        });
        return this.withSubjectLabels(portalId, rows, subject.kind === "portal");
    }

    async pinned(portalId: string, subject: TimelineSubject): Promise<TimelineComment[]> {
        const rows = await this.prisma.entityComment.findMany({
            where: {
                portalId,
                subjectKind: subject.kind,
                subjectId: subject.id,
                pinnedAt: { not: null },
                deletedAt: null,
            },
            orderBy: { pinnedAt: "desc" },
            include: commentInclude,
        });
        return rows.map(toTimelineComment);
    }

    /** В ленте у комментария — слово для ссылки на сущность, к которой он написан. */
    private async withSubjectLabels(
        portalId: string,
        rows: CommentRow[],
        feed: boolean
    ): Promise<TimelineComment[]> {
        const comments = rows.map(toTimelineComment);
        if (!feed) return comments;
        const labels = await this.hydrator.subjectLabels(
            portalId,
            comments.map((comment) => comment.subject)
        );
        return comments.map((comment) => ({
            ...comment,
            subject: {
                ...comment.subject,
                label: labels.get(subjectKey(comment.subject.kind, comment.subject.id)) ?? null,
            },
        }));
    }

    /** Имена к событиям: кто сделал, стадии и статусы — словами клуба; в ленте — о ком событие. */
    private async hydrateEvents(
        portalId: string,
        rows: DomainEventRow[],
        feed: boolean
    ): Promise<TimelineEvent[]> {
        const payloads = rows.map(payloadOf);
        const actors = rows.flatMap((row) =>
            row.actorKind === "employee" && row.actorId ? [row.actorId] : []
        );
        const subjects = feed
            ? rows.map((row, index) => subjectOfEvent(row, payloads[index] ?? {}))
            : [];
        const [names, labels, subjectLabels] = await Promise.all([
            this.hydrator.staffNames(portalId, [...new Set(actors)]),
            this.hydrator.eventLabels(
                portalId,
                idsOf(payloads, STAGE_FIELDS),
                idsOf(payloads, STATUS_FIELDS)
            ),
            this.hydrator.subjectLabels(
                portalId,
                subjects.filter((ref): ref is NonNullable<typeof ref> => ref !== null)
            ),
        ]);
        return rows.map((row, index) => {
            const payload = payloads[index] ?? {};
            const own = [...STAGE_FIELDS, ...STATUS_FIELDS]
                .map((field) => payload[field])
                .filter((id): id is string => typeof id === "string" && labels.has(id));
            const ref = subjects[index] ?? null;
            return {
                id: row.id,
                name: row.name as EventName,
                occurredAt: row.occurredAt,
                actor: {
                    kind: row.actorKind,
                    id: row.actorId,
                    name: row.actorId ? (names.get(row.actorId) ?? null) : null,
                },
                subject: ref
                    ? { ...ref, label: subjectLabels.get(subjectKey(ref.kind, ref.id)) ?? null }
                    : null,
                data: {
                    ...payload,
                    labels: Object.fromEntries(own.map((id) => [id, labels.get(id)])),
                },
            };
        });
    }
}
