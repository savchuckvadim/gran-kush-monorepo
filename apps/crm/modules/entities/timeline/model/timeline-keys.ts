import type { FeedFilter } from "../api/feed.api";
import type { TimelineFilter, TimelineSubject } from "../api/timeline.api";

export const timelineKeys = {
    all: ["timeline"] as const,
    subject: (subject: TimelineSubject) => ["timeline", subject.kind, subject.id] as const,
    page: (subject: TimelineSubject, filter: TimelineFilter) =>
        [...timelineKeys.subject(subject), filter] as const,
};

/** Лента — свой корень ключей: новые записи она показывает по кнопке, а не перечитывая сама себя. */
export const feedKeys = {
    all: ["feed"] as const,
    list: (portalId: string, filter: FeedFilter) =>
        ["feed", portalId, filter.groups.join(","), filter.mine] as const,
};
