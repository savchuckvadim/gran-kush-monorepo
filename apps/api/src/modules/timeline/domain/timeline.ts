import { COMMENT_SUBJECT_KINDS, type EventName } from "@workspace/domain-events";

import { type Permission, PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

/** О чём таймлайн: карточка сущности клуба или лента клуба (`portal`). */
export type TimelineSubjectKind = (typeof COMMENT_SUBJECT_KINDS)[number];

export interface TimelineSubject {
    kind: TimelineSubjectKind;
    id: string;
}

export const isTimelineSubjectKind = (value: string): value is TimelineSubjectKind =>
    (COMMENT_SUBJECT_KINDS as readonly string[]).includes(value);

/** Вид предмета из строки базы; незнакомый (запись новее сервера) — как запись клуба. */
export const subjectKindOf = (value: string): TimelineSubjectKind =>
    isTimelineSubjectKind(value) ? value : "portal";

/**
 * Кто видит таймлайн сущности: право на чтение её раздела. Товары видны всему персоналу, лента
 * клуба — тоже; события внутри фильтруются ещё и по аудитории каждого события.
 */
export const SUBJECT_READ_PERMISSION: Record<TimelineSubjectKind, Permission | null> = {
    member: PERMISSIONS.MembersRead,
    order: PERMISSIONS.OrdersRead,
    employee: PERMISSIONS.EmployeesRead,
    product: null,
    portal: null,
};

/** Длина комментария: заметка, а не документ. */
export const COMMENT_BODY_MAX = 4000;

/** Записей таймлайна за раз и сколько можно попросить. */
export const TIMELINE_PAGE = { default: 30, max: 100 } as const;

export interface TimelinePerson {
    id: string;
    name: string;
}

/** О чём запись: в ленте клуба — со словом для ссылки (номер заказа, имя). */
export interface TimelineSubjectRef {
    kind: TimelineSubjectKind;
    id: string;
    label: string | null;
}

/** Разделы ленты: группа события (`order.placed` → `order`) и записи команды (`comment`). */
export const FEED_GROUPS = [
    "order",
    "member",
    "presence",
    "comment",
    "employee",
    "product",
    "finance",
] as const;
export type FeedGroup = (typeof FEED_GROUPS)[number];
export const COMMENT_GROUP: FeedGroup = "comment";

export const isFeedGroup = (value: string): value is FeedGroup =>
    (FEED_GROUPS as readonly string[]).includes(value);

/** Что показать: разделы (пусто — всё) и записи одного сотрудника («только мои»). */
export interface TimelineFilter {
    groups: readonly FeedGroup[];
    authorEmployeeId: string | null;
}

export interface TimelineComment {
    id: string;
    subject: TimelineSubjectRef;
    /** `null` — комментарий удалён: в таймлайне остаётся отметка, а не текст */
    body: string | null;
    author: TimelinePerson | null;
    pinnedAt: Date | null;
    editedAt: Date | null;
    createdAt: Date;
}

export interface TimelineEvent {
    id: string;
    name: EventName;
    occurredAt: Date;
    actor: { kind: string; id: string | null; name: string | null };
    /** О ком событие — в ленте клуба; в таймлайне сущности не нужно */
    subject: TimelineSubjectRef | null;
    /** Поля события и подписи к ним (стадия, статус), без персональных данных */
    data: Record<string, unknown>;
}

export type TimelineEntry =
    | { kind: "event"; id: string; at: Date; event: TimelineEvent }
    | { kind: "comment"; id: string; at: Date; comment: TimelineComment };

/** Позиция в таймлайне: время и id — у событий одной транзакции время бывает одинаковым. */
export interface TimelineCursor {
    at: Date;
    id: string;
}

export const encodeCursor = (cursor: TimelineCursor): string =>
    Buffer.from(`${cursor.at.toISOString()}|${cursor.id}`).toString("base64url");

export const decodeCursor = (value: string | undefined): TimelineCursor | null => {
    if (!value) return null;
    const [at, id] = Buffer.from(value, "base64url").toString("utf8").split("|");
    const date = at ? new Date(at) : null;
    return date && !Number.isNaN(date.getTime()) && id ? { at: date, id } : null;
};

/** Сначала новое; при равном времени — по id, как сортирует база. */
export const newerFirst = (a: TimelineEntry, b: TimelineEntry): number =>
    b.at.getTime() - a.at.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
