# Backend Module Development Principles

## Purpose

This guide defines practical rules for building and evolving backend modules in `apps/api/src/modules`.
It is focused on predictability, strict typing, performance, and stable repository contracts.

## Module Boundaries

Each module must keep a clear layered structure:

- `api/` - controllers and DTOs
- `application/` - use-case services
- `domain/` - entities and repository interfaces (contracts)
- `infrastructure/` - Prisma and other external implementations

Rule: dependencies go inward (API -> application -> domain; infrastructure implements domain contracts).

## Repository Contract Rules

1. Repository interfaces must never expose `any`.
2. Contracts must describe exactly what the service needs.
3. Use separate repository methods for different data shapes:
   - `findByEmailForAuth(...)`
   - `findProfileByUserId(...)`
   - `findByIdWithDocuments(...)`

Do not create one generic method that returns "everything".

## Relations: Production-Safe Pattern

Prisma base models (`User`, `Member`, etc. from `@prisma/client`) do not include relations by default.
Relations are part of query payload type, not base model type.

Use this pattern:

1. Define an `include` constant in infrastructure/repository.
2. Derive type from `Prisma.XGetPayload`.
3. Return that type in repository method contract.

Example pattern:

```ts
import { Prisma } from "@prisma/client";

export const memberAuthInclude = {
    user: true,
    signature: true,
} as const;

export type MemberAuthView = Prisma.MemberGetPayload<{
    include: typeof memberAuthInclude;
}>;
```

This guarantees that when `include` changes, the type is updated automatically.

## Classes vs Types

Use **domain classes** when business behavior/invariants are needed.
Use **type aliases** for read models and relation payloads.

Recommended:

- `Member` class for domain behavior and write flows
- `MemberAuthView` / `UserWithMemberView` as payload types for query results

Avoid creating constructor-heavy classes for relation payload wrappers.

## Service Layer Rules

1. Services consume repository contracts only.
2. Services should not build Prisma query objects directly.
3. Services should rely on scenario-specific typed methods.

If service logic needs `user.member` or `member.user`, repository contract must guarantee it by method type.

## Performance Rules (Do Not Overload Queries)

1. Prefer `select` over `include` when full relation object is not required.
2. Split heavy reads into dedicated methods.
3. Never return full relation graphs by default.
4. Keep auth methods minimal (only needed fields).

Guideline:

- Login/auth: minimum fields
- Profile page: medium shape
- Admin details: extended shape

## DTO and Storage Boundary

DTO fields named like `storagePath` must contain path/URL, not raw base64 payload.
Binary file upload and business registration must be separated:

1. Upload file to storage
2. Receive path/URL
3. Pass path/URL to member registration

This prevents DB length errors and keeps data model clean.

## Type Safety Checklist for New Methods

Before merging a repository/service change:

1. No `Promise<any>` in repository contracts
2. No `any` in service critical flows
3. Query shape type derived from Prisma payload type
4. Method name reflects query shape/scope
5. Lint warnings for `no-unsafe-*` are resolved or explicitly justified

## Naming Guidelines

- Repository methods must be explicit:
  - good: `findByEmailForAuth`, `findMemberWithStatuses`
  - bad: `findByEmailWithRelations` (too broad)
- Type names must reflect use-case:
  - `UserAuthView`, `MemberProfileView`, `EmployeeAccessView`

## Migration Strategy for Existing Code

1. Replace broad methods with use-case-specific methods.
2. Introduce typed payload aliases gradually.
3. Remove `any` from interfaces first, then fix implementations.
4. Keep old method only temporarily behind deprecation comment.

---

Following these rules keeps module development predictable, typed, and scalable while controlling query cost.
