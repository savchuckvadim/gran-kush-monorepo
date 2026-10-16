# Platform admin

Next.js 16 app for the platform team (`admin.paf-paf.app`). It calls
the API through its own server-side proxy (`modules/shared/api/api.ts`) with an employee session.

```bash
pnpm --filter "./apps/admin" dev
pnpm --filter "./apps/admin" typecheck
```
