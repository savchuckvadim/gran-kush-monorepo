import type { z } from "zod";

import type { AggregateKind, EventScope } from "./envelope";

type PayloadKeys<S extends z.ZodTypeAny> = keyof z.output<S> & string;

/**
 * Who may receive the event over realtime and who is a candidate for a notification. Rights are
 * checked again on the API when the receiver reads data: the event only says "something changed".
 */
export interface EventAudience<S extends z.ZodTypeAny = z.ZodTypeAny> {
    /** Employees of the portal; `permission: null` means any active employee. */
    staff?: { permission: string | null };
    /** The member whose id is in `payload[by]`. */
    member?: { by: PayloadKeys<S> };
    /** One employee of the portal whose id is in `payload[by]` (a personal notification). */
    employee?: { by: PayloadKeys<S> };
    /** The account whose user id is in `payload[by]` (cabinet without a club, the account itself). */
    user?: { by: PayloadKeys<S> };
    /** Every confirmed member of the portal (catalog, club-wide changes). */
    members?: true;
}

/**
 * An event definition seen without its payload type: what the queue worker and the realtime
 * gateway work with when the name comes from outside (a job, a socket message).
 */
export interface AnyEventDefinition {
    readonly name: string;
    readonly version: number;
    readonly scope: EventScope;
    readonly aggregate: AggregateKind;
    readonly payload: z.ZodTypeAny;
    readonly audience: {
        staff?: { permission: string | null };
        member?: { by: string };
        employee?: { by: string };
        user?: { by: string };
        members?: true;
    };
    readonly publicPayload: readonly string[];
    readonly description: string;
}

export interface EventDefinition<
    N extends string = string,
    S extends z.ZodTypeAny = z.ZodTypeAny,
> extends AnyEventDefinition {
    readonly name: N;
    /** Payload contract. Parsing strips unknown keys, so a Prisma row never leaks through. */
    readonly payload: S;
    readonly audience: EventAudience<S>;
    /** Payload fields a member or an account may see; staff see the whole payload. */
    readonly publicPayload: readonly PayloadKeys<S>[];
}

export const defineEvent = <N extends string, S extends z.ZodTypeAny>(
    definition: EventDefinition<N, S>
): EventDefinition<N, S> => definition;
