# Realtime

**Implemented** (TASK-794, TASK-795, 2026-10-20). Plan: [tasks/events-realtime](../tasks/events-realtime.md);
the bus it listens to: [DOMAIN_EVENTS](./DOMAIN_EVENTS.md).

The CRM and the member cabinet learn about changes from the server: a stage moved on the kanban, a
member checked in at the door, a product ran out. The server sends only the fact (a domain event);
each page refetches what it shows with its own requests and rights.

```
domain_events ─► queue ─► RealtimeConsumer ─► socket.io rooms ─► RealtimeProvider ─► invalidate query keys
```

## Server — `apps/api/src/modules/realtime`

- socket.io, **WebSocket only** (no long-polling: it would need sticky sessions behind several API
  instances), path `/socket.io`, namespaces **`/crm`** and **`/cabinet`**.
- Several instances share rooms and disconnects through Redis (`@socket.io/redis-adapter`,
  `RealtimeIoAdapter` in `main.ts`, the same `REDIS_URL` as the queues).

### Handshake

Same rules as HTTP (`RealtimeAuthService`):

| Input         | Rule                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `auth.token`  | Access token (mobile apps, Bearer) — checked by `SessionsService.authenticate`                                                    |
| cookie        | `crm_access` on `/crm`, `cabinet_access` on `/cabinet`; the other app's cookie is not read                                        |
| `Origin`      | With a cookie only from the app's own front: `/crm` — `CRM_FRONTEND_URL`, `/cabinet` — `MEMBER_FRONTEND_URL` (and the API itself) |
| `auth.portal` | Club slug; membership as in `MembershipGuard` (`findActiveEmployee` / `findActiveMember`)                                         |

Refusals come back as `connect_error.message`: `unauthorized` (refresh and retry),
`forbidden` (no membership in this club), `origin_not_allowed`. A token of one app does not open the
other app's namespace (JWT audience).

The access token's `exp` closes the connection; the client refreshes the session and reconnects.

### Rooms

Every club room starts with `portal:<id>:` and is built from `event.portalId`, so an event of one club
cannot reach another club's sockets.

| Room                                                 | Who                            |
| ---------------------------------------------------- | ------------------------------ |
| `user:<userId>`, `session:<sid>`                     | every connection               |
| `portal:<id>:staff`                                  | employees of the club          |
| `portal:<id>:permission:<code>`                      | employees with that permission |
| `portal:<id>:employee:<id>`, `portal:<id>:role:<id>` | the employee, the role         |
| `portal:<id>:members`                                | confirmed members of the club  |
| `portal:<id>:member:<id>`                            | the member                     |

### Delivery

`RealtimeConsumer` subscribes to every event of the catalog and sends it by its `audience`:

- `staff` → `/crm`, the permission room (or `staff`), **the whole envelope**;
- `member` (`by: memberId`), `members`, `user` (`by: userId`) → **only `publicPayload`**.

Rights change → connections are closed and the client reconnects with the new rights:
`session.revoked` (that session), `employee.access_changed` (the employee), `role.changed` with
permissions (everyone with the role), `member.left`, `member.updated` with `isActive`.

## Client — `apps/crm`

| Where                              | What                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `modules/shared/realtime`          | `RealtimeConnection`, `RealtimeProvider`, `useRealtimeEvent`, `useRealtimeStatus`, the header indicator |
| `modules/entities/<x>/realtime.ts` | rules: which events invalidate which query keys of the entity                                           |
| `modules/processes/realtime`       | `CrmRealtime` (`[portal]/crm/layout.tsx`), `CabinetRealtime` (`m/(app)/layout.tsx`) and the rule lists  |

- One event → `invalidateQueries` of the rule's keys with `cancelRefetch: false` (bursts from one
  transaction do not restart requests).
- Reconnect after an outage → every query is invalidated (events of the gap could be lost).
- No connection → active queries are refetched every 30 s (`REALTIME_FALLBACK_POLL_MS`), the header
  shows a crossed-out wifi icon.
- `unauthorized` and server disconnects → the same refresh helper as the API client
  (`modules/shared/api/session-refresh.ts`), then reconnect.

### Adding a screen

1. The query keys of the screen live in its entity.
2. A rule in `entities/<x>/realtime.ts`: `{ events: [...], keys: (event, { portal }) => [...] }`.
3. A line in `processes/realtime/realtime-rules.ts`. Rules are imported from their files, not from the
   entity index (indexes pull hooks, some hooks pull processes — an import cycle at start).

## Local check

A page on `club.localhost` and the API on `localhost` are different sites: the browser does not send
the API cookies. Run the stand on `lvh.me` (`api.lvh.me:3000`, `crm.lvh.me`, `club.lvh.me` — Next
allows `*.lvh.me` in dev) with `CORS_ORIGIN`, `CRM_FRONTEND_URL`, `MEMBER_FRONTEND_URL`,
`API_PUBLIC_URL` and the CRM's `NEXT_PUBLIC_API_URL` pointing there. E2E: `test/realtime.e2e-spec.ts`.

## Not covered yet

Card order inside a kanban column, member documents, club policy and settings screens have no events;
they refresh on reconnect and on their own requests. Connection limits per session are not enforced.
