import type { TimelineFilter, TimelineSubject } from "../api/timeline.api";

export const timelineKeys = {
    all: ["timeline"] as const,
    subject: (subject: TimelineSubject) => ["timeline", subject.kind, subject.id] as const,
    page: (subject: TimelineSubject, filter: TimelineFilter) =>
        [...timelineKeys.subject(subject), filter] as const,
};
