import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { EVENT_CATALOG, type EventName } from "@workspace/domain-events";

import type { Permission } from "@modules/portal/crm/access/domain/permissions";

import {
    decodeCursor,
    encodeCursor,
    newerFirst,
    SUBJECT_READ_PERMISSION,
    TIMELINE_PAGE,
    type TimelineComment,
    type TimelineEntry,
    type TimelineSubject,
} from "../domain/timeline";
import { TimelineRepository } from "../domain/timeline-repository.interface";

/** Кто смотрит таймлайн: сотрудник клуба и права его роли. */
export interface TimelineViewer {
    employeeId: string;
    permissions: readonly Permission[];
}

export interface TimelinePage {
    /** Закреплённые комментарии — только на первой странице */
    pinned: TimelineComment[];
    entries: TimelineEntry[];
    nextCursor: string | null;
}

/** Сами комментарии в таймлайне есть — их события показывать второй раз не нужно. */
const COMMENT_EVENT_PREFIX = "comment.";

/** События, которые сотрудник получил бы в realtime: аудитория `staff` и его права. */
const visibleEventNames = (permissions: readonly Permission[]): EventName[] =>
    (Object.keys(EVENT_CATALOG) as EventName[]).filter((name) => {
        if (name.startsWith(COMMENT_EVENT_PREFIX)) return false;
        const staff = EVENT_CATALOG[name].audience.staff;
        return (
            staff !== undefined &&
            (staff.permission === null || permissions.some((code) => code === staff.permission))
        );
    });

/**
 * Таймлайн сущности (TASK-782): события шины о ней и комментарии персонала, новые сверху.
 *
 * - таймлайн видит тот, у кого право раздела сущности (участники — `members.read`, заказы —
 *   `orders.read`…), и только у своего клуба: чужая или несуществующая сущность — 404;
 * - событие в таймлайне видит тот, кому realtime отдал бы его целиком (`audience.staff`);
 * - страница — курсором (время, id): события одной транзакции не теряются на границе страниц.
 */
@Injectable()
export class TimelineService {
    constructor(private readonly repository: TimelineRepository) {}

    async page(
        portalId: string,
        viewer: TimelineViewer,
        subject: TimelineSubject,
        options: { cursor?: string; limit?: number; only?: "comments" | "events" }
    ): Promise<TimelinePage> {
        await this.assertReadable(portalId, viewer, subject);
        const limit = Math.min(options.limit ?? TIMELINE_PAGE.default, TIMELINE_PAGE.max);
        const before = decodeCursor(options.cursor);
        const names = visibleEventNames(viewer.permissions);
        const [events, comments, pinned] = await Promise.all([
            options.only === "comments"
                ? []
                : this.repository.events(portalId, subject, names, before, limit + 1),
            options.only === "events"
                ? []
                : this.repository.comments(portalId, subject, before, limit + 1),
            before ? [] : this.repository.pinned(portalId, subject),
        ]);
        const merged: TimelineEntry[] = [
            ...events.map((event) => ({
                kind: "event" as const,
                id: event.id,
                at: event.occurredAt,
                event,
            })),
            ...comments.map((comment) => ({
                kind: "comment" as const,
                id: comment.id,
                at: comment.createdAt,
                comment,
            })),
        ].sort(newerFirst);
        const entries = merged.slice(0, limit);
        const last = entries.at(-1);
        return {
            pinned,
            entries,
            nextCursor:
                merged.length > limit && last ? encodeCursor({ at: last.at, id: last.id }) : null,
        };
    }

    /** Право раздела и сущность своего клуба; лента клуба — только своего. */
    async assertReadable(
        portalId: string,
        viewer: TimelineViewer,
        subject: TimelineSubject
    ): Promise<void> {
        const permission = SUBJECT_READ_PERMISSION[subject.kind];
        if (permission && !viewer.permissions.includes(permission)) {
            throw new ForbiddenException({ message: "Missing permission", errors: [permission] });
        }
        const exists =
            subject.kind === "portal"
                ? subject.id === portalId
                : await this.repository.subjectExists(portalId, subject);
        if (!exists) throw new NotFoundException("Timeline not found");
    }
}
