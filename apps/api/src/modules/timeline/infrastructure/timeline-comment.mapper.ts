import type { EntityComment } from "@prisma/client";

import type { TimelineComment } from "../domain/timeline";

import { staffName, type StaffNameRow } from "./staff-names";

export type CommentRow = EntityComment & { author: StaffNameRow | null };

/** Удалённый комментарий остаётся в таймлайне без текста и не закреплённым. */
export const toTimelineComment = (row: CommentRow): TimelineComment => ({
    id: row.id,
    body: row.deletedAt ? null : row.body,
    author: row.author ? { id: row.author.id, name: staffName(row.author) } : null,
    pinnedAt: row.deletedAt ? null : row.pinnedAt,
    editedAt: row.editedAt,
    createdAt: row.createdAt,
});
