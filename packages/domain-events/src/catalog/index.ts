import type { z } from "zod";

import type { AnyEventDefinition } from "../define-event";
import type { DomainEventEnvelope } from "../envelope";

import { employeeAccessChanged, employeeJoined } from "./employee.events";
import { financeProfileUpdated } from "./finance.events";
import {
    memberConsentGiven,
    memberJoined,
    memberLeft,
    memberStatusChanged,
    memberUpdated,
} from "./member.events";
import {
    orderCancelled,
    orderPaymentChanged,
    orderPlaced,
    orderStageChanged,
} from "./order.events";
import { portalFounded, portalModuleChanged } from "./portal.events";
import { presenceEntered, presenceLeft } from "./presence.events";
import { productChanged, productStockChanged } from "./product.events";
import { roleChanged } from "./role.events";
import { sessionRevoked } from "./session.events";

/**
 * Every event the platform publishes. The key equals `definition.name`; a test keeps them in sync.
 * Adding an event: a `defineEvent` in the module file, a line here, a factory in the API module
 * that owns the aggregate.
 */
export const EVENT_CATALOG = {
    "portal.founded": portalFounded,
    "portal.module_changed": portalModuleChanged,
    "finance.profile_updated": financeProfileUpdated,
    "member.joined": memberJoined,
    "member.consent_given": memberConsentGiven,
    "member.left": memberLeft,
    "member.status_changed": memberStatusChanged,
    "member.updated": memberUpdated,
    "order.placed": orderPlaced,
    "order.stage_changed": orderStageChanged,
    "order.cancelled": orderCancelled,
    "order.payment_changed": orderPaymentChanged,
    "product.changed": productChanged,
    "product.stock_changed": productStockChanged,
    "presence.entered": presenceEntered,
    "presence.left": presenceLeft,
    "employee.joined": employeeJoined,
    "employee.access_changed": employeeAccessChanged,
    "role.changed": roleChanged,
    "session.revoked": sessionRevoked,
} as const;

export type EventCatalog = typeof EVENT_CATALOG;
export type EventName = keyof EventCatalog;
export type EventPayload<N extends EventName> = z.output<EventCatalog[N]["payload"]>;

/** A typed envelope: `DomainEvent<"order.placed">` or the union of all events. */
export type DomainEvent<N extends EventName = EventName> = N extends EventName
    ? DomainEventEnvelope<N, EventPayload<N>>
    : never;

export const EVENT_NAMES = Object.keys(EVENT_CATALOG) as readonly EventName[];

export const isEventName = (name: string): name is EventName => name in EVENT_CATALOG;

export const eventDefinition = <N extends EventName>(name: N): EventCatalog[N] =>
    EVENT_CATALOG[name];

/** Definition by an untrusted name (a queue job, a socket message); `undefined` when unknown. */
export const findEventDefinition = (name: string): AnyEventDefinition | undefined =>
    isEventName(name) ? EVENT_CATALOG[name] : undefined;

/** The payload a member or an account may see: only the fields listed in `publicPayload`. */
export const publicPayloadOf = (event: DomainEventEnvelope): Record<string, unknown> => {
    const definition = findEventDefinition(event.name);
    if (!definition) return {};
    const source = (event.payload ?? {}) as Record<string, unknown>;
    return Object.fromEntries(definition.publicPayload.map((key) => [key, source[key]]));
};

export {
    employeeAccessChanged,
    employeeJoined,
    financeProfileUpdated,
    memberConsentGiven,
    memberJoined,
    memberLeft,
    memberStatusChanged,
    memberUpdated,
    orderCancelled,
    orderPaymentChanged,
    orderPlaced,
    orderStageChanged,
    portalFounded,
    portalModuleChanged,
    presenceEntered,
    presenceLeft,
    productChanged,
    productStockChanged,
    roleChanged,
    sessionRevoked,
};
export { MEMBER_CHANGED_PARTS, type MemberChangedPart } from "./member.events";
export { ORDER_STAGE_SEMANTICS } from "./order.events";
export { ROLE_CHANGED_PARTS, type RoleChangedPart } from "./role.events";
export { SESSION_AUDIENCES } from "./session.events";
