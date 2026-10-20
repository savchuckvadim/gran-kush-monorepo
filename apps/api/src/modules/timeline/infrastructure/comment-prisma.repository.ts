import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, employeeActor, type NewDomainEvent } from "@modules/events";

import {
    isTimelineSubjectKind,
    type TimelineComment,
    type TimelineSubject,
} from "../domain/timeline";
import {
    type CommentChange,
    CommentRepository,
    type NewComment,
    type StoredComment,
} from "../domain/timeline-repository.interface";

import { STAFF_NAME_SELECT } from "./staff-names";
import { toTimelineComment } from "./timeline-comment.mapper";

const include = { author: { select: STAFF_NAME_SELECT } } as const;

const commentPayload = (id: string, subject: TimelineSubject) => ({
    commentId: id,
    subjectKind: subject.kind,
    subjectId: subject.id,
});

@Injectable()
export class CommentPrismaRepository extends CommentRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {
        super();
    }

    async create(portalId: string, comment: NewComment): Promise<TimelineComment> {
        return this.prisma.$transaction(async (tx) => {
            const row = await tx.entityComment.create({
                data: {
                    portalId,
                    subjectKind: comment.subject.kind,
                    subjectId: comment.subject.id,
                    authorEmployeeId: comment.authorEmployeeId,
                    body: comment.body,
                },
                include,
            });
            await this.events.publish(tx, {
                name: "comment.added",
                portalId,
                actor: employeeActor(comment.authorEmployeeId),
                aggregateId: row.id,
                payload: commentPayload(row.id, comment.subject),
            });
            return toTimelineComment(row);
        });
    }

    async findById(portalId: string, id: string): Promise<StoredComment | null> {
        const row = await this.prisma.entityComment.findFirst({ where: { id, portalId }, include });
        if (!row || !isTimelineSubjectKind(row.subjectKind)) return null;
        return {
            ...toTimelineComment(row),
            portalId: row.portalId,
            subject: { kind: row.subjectKind, id: row.subjectId },
            authorEmployeeId: row.authorEmployeeId,
            deleted: row.deletedAt !== null,
        };
    }

    async update(
        portalId: string,
        id: string,
        change: CommentChange,
        actorEmployeeId: string
    ): Promise<TimelineComment> {
        const data =
            change.kind === "edited"
                ? { body: change.body, editedAt: new Date() }
                : change.kind === "pinned"
                  ? { pinnedAt: new Date(), pinnedByEmployeeId: actorEmployeeId }
                  : { pinnedAt: null, pinnedByEmployeeId: null };
        return this.prisma.$transaction(async (tx) => {
            const row = await tx.entityComment.update({ where: { id, portalId }, data, include });
            await this.publish(tx, "comment.updated", row, actorEmployeeId, change.kind);
            return toTimelineComment(row);
        });
    }

    async softDelete(portalId: string, id: string, actorEmployeeId: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const row = await tx.entityComment.update({
                where: { id, portalId },
                data: { deletedAt: new Date(), pinnedAt: null, pinnedByEmployeeId: null },
            });
            await this.publish(tx, "comment.deleted", row, actorEmployeeId);
        });
    }

    private async publish(
        tx: Parameters<DomainEventPublisher["publish"]>[0],
        name: "comment.updated" | "comment.deleted",
        row: { id: string; portalId: string; subjectKind: string; subjectId: string },
        actorEmployeeId: string,
        change?: CommentChange["kind"]
    ): Promise<void> {
        if (!isTimelineSubjectKind(row.subjectKind)) return;
        const payload = commentPayload(row.id, { kind: row.subjectKind, id: row.subjectId });
        const base = {
            portalId: row.portalId,
            actor: employeeActor(actorEmployeeId),
            aggregateId: row.id,
        };
        const event: NewDomainEvent =
            name === "comment.updated"
                ? { ...base, name, payload: { ...payload, change: change ?? "edited" } }
                : { ...base, name, payload };
        await this.events.publish(tx, event);
    }
}
