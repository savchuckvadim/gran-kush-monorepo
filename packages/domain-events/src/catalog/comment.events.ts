import { z } from "zod";

import { defineEvent } from "../define-event";

/** What a staff comment is about: an entity card or the club feed (`portal`). */
export const COMMENT_SUBJECT_KINDS = ["member", "order", "employee", "product", "portal"] as const;

const comment = {
    commentId: z.string().min(1),
    subjectKind: z.enum(COMMENT_SUBJECT_KINDS),
    subjectId: z.string().min(1),
};

/** Staff comments are internal notes: members never receive them. */
const STAFF = { staff: { permission: null } } as const;

export const commentAdded = defineEvent({
    name: "comment.added",
    version: 1,
    scope: "portal",
    aggregate: "comment",
    payload: z.object(comment),
    audience: STAFF,
    publicPayload: [],
    description: "A staff comment was added to a card timeline or the club feed",
});

export const commentUpdated = defineEvent({
    name: "comment.updated",
    version: 1,
    scope: "portal",
    aggregate: "comment",
    payload: z.object({ ...comment, change: z.enum(["edited", "pinned", "unpinned"]) }),
    audience: STAFF,
    publicPayload: [],
    description: "A staff comment was edited, pinned or unpinned",
});

export const commentDeleted = defineEvent({
    name: "comment.deleted",
    version: 1,
    scope: "portal",
    aggregate: "comment",
    payload: z.object(comment),
    audience: STAFF,
    publicPayload: [],
    description: "A staff comment was deleted",
});
