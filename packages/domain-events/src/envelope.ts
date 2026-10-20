import { z } from "zod";

/** Who caused the event. `user` is an account outside any club (sessions, account security). */
export const ACTOR_KINDS = ["employee", "member", "user", "system"] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

/** What the event is about. One aggregate — one ordering guarantee (by `occurredAt`). */
export const AGGREGATE_KINDS = [
    "portal",
    "member",
    "order",
    "product",
    "presence_session",
    "employee",
    "role",
    "session",
] as const;
export type AggregateKind = (typeof AGGREGATE_KINDS)[number];

/**
 * `portal` events belong to one club and always carry `portalId`; `account` events belong to an
 * account across clubs (a revoked session) and carry `portalId: null`.
 */
export const EVENT_SCOPES = ["portal", "account"] as const;
export type EventScope = (typeof EVENT_SCOPES)[number];

export interface EventActor {
    kind: ActorKind;
    /** Employee id, member id or user id by `kind`; `null` for the system. */
    id: string | null;
}

export interface EventAggregate {
    kind: AggregateKind;
    id: string;
}

/**
 * The envelope every consumer receives: the API writes it to the outbox, the queue carries it,
 * the realtime gateway forwards it (with a trimmed payload) to browsers and apps.
 */
export interface DomainEventEnvelope<N extends string = string, P = unknown> {
    /** Idempotency key for consumers. */
    id: string;
    name: N;
    /** Payload shape version; a new shape is a new version, the old one stays readable. */
    version: number;
    portalId: string | null;
    /** ISO 8601 */
    occurredAt: string;
    actor: EventActor;
    aggregate: EventAggregate;
    payload: P;
}

export const eventActorSchema = z.object({
    kind: z.enum(ACTOR_KINDS),
    id: z.string().min(1).nullable(),
});

export const eventAggregateSchema = z.object({
    kind: z.enum(AGGREGATE_KINDS),
    id: z.string().min(1),
});

/** Structural check of an envelope without its payload (the catalog validates the payload). */
export const envelopeSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    version: z.number().int().positive(),
    portalId: z.string().min(1).nullable(),
    occurredAt: z.string().datetime(),
    actor: eventActorSchema,
    aggregate: eventAggregateSchema,
    payload: z.unknown(),
});
