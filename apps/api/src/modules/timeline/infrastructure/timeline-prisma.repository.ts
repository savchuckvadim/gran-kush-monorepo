import { Injectable } from "@nestjs/common";

import type { DomainEvent as DomainEventRow, Prisma } from "@prisma/client";
import type { EventName } from "@workspace/domain-events";

import { PrismaService } from "@common/prisma/prisma.service";

import type {
    TimelineComment,
    TimelineCursor,
    TimelineEvent,
    TimelineSubject,
} from "../domain/timeline";
import { TimelineRepository } from "../domain/timeline-repository.interface";

import { STAFF_NAME_SELECT, staffName } from "./staff-names";
import { toTimelineComment } from "./timeline-comment.mapper";

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
const subjectFilter = (subject: TimelineSubject): Prisma.DomainEventWhereInput => {
    if (subject.kind === "portal") return {};
    if (subject.kind === "member") return { payload: { path: ["memberId"], equals: subject.id } };
    return { aggregateKind: subject.kind, aggregateId: subject.id };
};

const commentInclude = { author: { select: STAFF_NAME_SELECT } } as const;

interface EventLabel {
    label: string;
    labelI18n: Prisma.JsonValue;
}

@Injectable()
export class TimelinePrismaRepository extends TimelineRepository {
    constructor(private readonly prisma: PrismaService) {
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
        names: readonly EventName[],
        before: TimelineCursor | null,
        limit: number
    ): Promise<TimelineEvent[]> {
        if (!names.length) return [];
        const rows = await this.prisma.domainEvent.findMany({
            where: {
                portalId,
                name: { in: [...names] },
                ...subjectFilter(subject),
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
        return this.hydrate(portalId, rows);
    }

    async comments(
        portalId: string,
        subject: TimelineSubject,
        before: TimelineCursor | null,
        limit: number
    ): Promise<TimelineComment[]> {
        const rows = await this.prisma.entityComment.findMany({
            where: {
                portalId,
                subjectKind: subject.kind,
                subjectId: subject.id,
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
        return rows.map(toTimelineComment);
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

    /** Имена к событиям: кто сделал, стадии заказа и статусы участника — словами клуба. */
    private async hydrate(portalId: string, rows: DomainEventRow[]): Promise<TimelineEvent[]> {
        const payloads = rows.map(payloadOf);
        const employeeIds = [
            ...new Set(
                rows.flatMap((row) =>
                    row.actorKind === "employee" && row.actorId ? [row.actorId] : []
                )
            ),
        ];
        const [names, labels] = await Promise.all([
            this.staffNames(portalId, employeeIds),
            this.labels(portalId, idsOf(payloads, STAGE_FIELDS), idsOf(payloads, STATUS_FIELDS)),
        ]);
        return rows.map((row, index) => {
            const payload = payloads[index] ?? {};
            const own = [...STAGE_FIELDS, ...STATUS_FIELDS]
                .map((field) => payload[field])
                .filter((id): id is string => typeof id === "string" && labels.has(id));
            return {
                id: row.id,
                name: row.name as EventName,
                occurredAt: row.occurredAt,
                actor: {
                    kind: row.actorKind,
                    id: row.actorId,
                    name: row.actorId ? (names.get(row.actorId) ?? null) : null,
                },
                data: {
                    ...payload,
                    labels: Object.fromEntries(own.map((id) => [id, labels.get(id)])),
                },
            };
        });
    }

    private async staffNames(portalId: string, ids: string[]): Promise<Map<string, string>> {
        if (!ids.length) return new Map();
        const rows = await this.prisma.employee.findMany({
            where: { portalId, id: { in: ids } },
            select: STAFF_NAME_SELECT,
        });
        return new Map(rows.map((row) => [row.id, staffName(row)]));
    }

    /** Подписи стадий заказа и статусов участника по id — только своего клуба. */
    private async labels(
        portalId: string,
        stageIds: string[],
        statusIds: string[]
    ): Promise<Map<string, EventLabel>> {
        const [stages, statuses] = await Promise.all([
            stageIds.length
                ? this.prisma.stage.findMany({
                      where: { id: { in: stageIds }, stageCategory: { portalId } },
                      select: { id: true, name: true, nameI18n: true },
                  })
                : Promise.resolve([]),
            statusIds.length
                ? this.prisma.statusItem.findMany({
                      where: { id: { in: statusIds }, statusSet: { portalId } },
                      select: { id: true, label: true, labelI18n: true },
                  })
                : Promise.resolve([]),
        ]);
        const labels = new Map<string, EventLabel>();
        for (const stage of stages)
            labels.set(stage.id, { label: stage.name, labelI18n: stage.nameI18n });
        for (const status of statuses)
            labels.set(status.id, { label: status.label, labelI18n: status.labelI18n });
        return labels;
    }
}
