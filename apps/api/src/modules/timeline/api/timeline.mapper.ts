import type { TimelineComment, TimelineEntry } from "../domain/timeline";

import type { TimelineCommentDto, TimelineEntryDto } from "./dto/timeline.dto";

export const toCommentDto = (comment: TimelineComment): TimelineCommentDto => ({
    id: comment.id,
    body: comment.body,
    author: comment.author,
    pinnedAt: comment.pinnedAt?.toISOString() ?? null,
    editedAt: comment.editedAt?.toISOString() ?? null,
    createdAt: comment.createdAt.toISOString(),
});

export const toEntryDto = (entry: TimelineEntry): TimelineEntryDto =>
    entry.kind === "comment"
        ? {
              kind: "comment",
              id: entry.id,
              at: entry.at.toISOString(),
              comment: toCommentDto(entry.comment),
          }
        : {
              kind: "event",
              id: entry.id,
              at: entry.at.toISOString(),
              event: {
                  id: entry.event.id,
                  name: entry.event.name,
                  occurredAt: entry.event.occurredAt.toISOString(),
                  actor: entry.event.actor,
                  data: entry.event.data,
              },
          };
