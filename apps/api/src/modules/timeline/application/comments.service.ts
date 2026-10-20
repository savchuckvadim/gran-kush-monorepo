import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import type { TimelineComment, TimelineSubject } from "../domain/timeline";
import { CommentRepository, type StoredComment } from "../domain/timeline-repository.interface";

import { TimelineService, type TimelineViewer } from "./timeline.service";

/** Код 403: править комментарий может только его автор. */
export const COMMENT_NOT_AUTHOR = "comment_not_author";

/**
 * Комментарии персонала в таймлайне и ленте (TASK-782, TASK-808):
 *
 * - писать и закреплять может каждый, кто видит таймлайн сущности;
 * - править текст — только автор; удалить — автор или администратор клуба (`settings.club`);
 * - удаление мягкое: в таймлайне остаётся отметка «удалён».
 */
@Injectable()
export class CommentsService {
    constructor(
        private readonly timeline: TimelineService,
        private readonly comments: CommentRepository
    ) {}

    async add(
        portalId: string,
        viewer: TimelineViewer,
        subject: TimelineSubject,
        body: string
    ): Promise<TimelineComment> {
        await this.timeline.assertReadable(portalId, viewer, subject);
        return this.comments.create(portalId, {
            subject,
            authorEmployeeId: viewer.employeeId,
            body: body.trim(),
        });
    }

    async edit(
        portalId: string,
        viewer: TimelineViewer,
        id: string,
        body: string
    ): Promise<TimelineComment> {
        const comment = await this.readable(portalId, viewer, id);
        if (comment.authorEmployeeId !== viewer.employeeId) {
            throw new ForbiddenException({
                message: "Only the author edits a comment",
                code: COMMENT_NOT_AUTHOR,
            });
        }
        return this.comments.update(
            portalId,
            id,
            { kind: "edited", body: body.trim() },
            viewer.employeeId
        );
    }

    async pin(
        portalId: string,
        viewer: TimelineViewer,
        id: string,
        pinned: boolean
    ): Promise<TimelineComment> {
        await this.readable(portalId, viewer, id);
        return this.comments.update(
            portalId,
            id,
            { kind: pinned ? "pinned" : "unpinned" },
            viewer.employeeId
        );
    }

    async remove(portalId: string, viewer: TimelineViewer, id: string): Promise<void> {
        const comment = await this.readable(portalId, viewer, id);
        const admin = viewer.permissions.includes(PERMISSIONS.SettingsClub);
        if (comment.authorEmployeeId !== viewer.employeeId && !admin) {
            throw new ForbiddenException({
                message: "Only the author deletes a comment",
                code: COMMENT_NOT_AUTHOR,
            });
        }
        await this.comments.softDelete(portalId, id, viewer.employeeId);
    }

    private async readable(
        portalId: string,
        viewer: TimelineViewer,
        id: string
    ): Promise<StoredComment> {
        const comment = await this.comments.findById(portalId, id);
        if (!comment || comment.deleted) throw new NotFoundException("Comment not found");
        await this.timeline.assertReadable(portalId, viewer, comment.subject);
        return comment;
    }
}
