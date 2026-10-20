import type { EventName } from "@workspace/domain-events";

import type { TimelineComment, TimelineCursor, TimelineEvent, TimelineSubject } from "./timeline";

export interface NewComment {
    subject: TimelineSubject;
    authorEmployeeId: string;
    body: string;
}

export interface StoredComment extends TimelineComment {
    portalId: string;
    subject: TimelineSubject;
    authorEmployeeId: string | null;
    deleted: boolean;
}

/** Чтение таймлайна: события шины о сущности и комментарии к ней, страницами от новых к старым. */
export abstract class TimelineRepository {
    /** Есть ли сущность в клубе — иначе таймлайн чужой или пустой адрес. */
    abstract subjectExists(portalId: string, subject: TimelineSubject): Promise<boolean>;

    /** События о сущности из перечисленных (видимых сотруднику), новые сверху. */
    abstract events(
        portalId: string,
        subject: TimelineSubject,
        names: readonly EventName[],
        before: TimelineCursor | null,
        limit: number
    ): Promise<TimelineEvent[]>;

    abstract comments(
        portalId: string,
        subject: TimelineSubject,
        before: TimelineCursor | null,
        limit: number
    ): Promise<TimelineComment[]>;

    abstract pinned(portalId: string, subject: TimelineSubject): Promise<TimelineComment[]>;
}

export type CommentChange =
    | { kind: "edited"; body: string }
    | { kind: "pinned" }
    | { kind: "unpinned" };

/** Комментарии сотрудников: запись и события `comment.*` — одной транзакцией. */
export abstract class CommentRepository {
    abstract create(portalId: string, comment: NewComment): Promise<TimelineComment>;

    abstract findById(portalId: string, id: string): Promise<StoredComment | null>;

    abstract update(
        portalId: string,
        id: string,
        change: CommentChange,
        actorEmployeeId: string
    ): Promise<TimelineComment>;

    abstract softDelete(portalId: string, id: string, actorEmployeeId: string): Promise<void>;
}
