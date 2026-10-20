import type { EventName } from "@workspace/domain-events";

import type { RealtimeRule } from "@/modules/shared/realtime";

import { timelineKeys } from "./model/timeline-keys";

/** События, из которых складываются таймлайны и лента клуба. */
export const TIMELINE_EVENTS: readonly EventName[] = [
    "comment.added",
    "comment.updated",
    "comment.deleted",
    "order.placed",
    "order.stage_changed",
    "order.cancelled",
    "order.payment_changed",
    "member.joined",
    "member.consent_given",
    "member.left",
    "member.status_changed",
    "member.updated",
    "presence.entered",
    "presence.left",
    "employee.joined",
    "employee.access_changed",
    "product.changed",
];

/** Комментарии и события сущностей: открытые таймлайны перечитываются у всех. */
export const timelineRealtimeRules: readonly RealtimeRule[] = [
    { events: TIMELINE_EVENTS, keys: () => [timelineKeys.all] },
];
