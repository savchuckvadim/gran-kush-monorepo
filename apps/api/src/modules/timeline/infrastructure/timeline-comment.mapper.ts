import type { EntityComment } from "@prisma/client";

import { subjectKindOf, type TimelineComment } from "../domain/timeline";

import { personName, type PersonNameRow } from "./staff-names";

export type CommentRow = EntityComment & { author: PersonNameRow | null };

/** Удалённый комментарий остаётся в таймлайне без текста и не закреплённым. */
export const toTimelineComment = (row: CommentRow): TimelineComment => ({
    id: row.id,
    subject: { kind: subjectKindOf(row.subjectKind), id: row.subjectId, label: null },
    body: row.deletedAt ? null : row.body,
    author: row.author ? { id: row.author.id, name: personName(row.author) } : null,
    pinnedAt: row.deletedAt ? null : row.pinnedAt,
    editedAt: row.editedAt,
    createdAt: row.createdAt,
});
