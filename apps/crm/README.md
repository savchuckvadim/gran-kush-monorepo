# CRM and member cabinet

Next.js 16 app on port 5000. One build serves two hosts:

- `crm.paf-paf.app` — the CRM for club staff (`app/[locale]/[portal]/crm/…`);
- `club.paf-paf.app` — the member cabinet (`app/[locale]/m/…`); `proxy.ts` rewrites the visible
  addresses by host, rules in `modules/shared/config/club-routes.ts`.

```bash
pnpm --filter crm dev        # NEXT_PUBLIC_API_URL from .env.local
pnpm --filter crm typecheck
```

Structure follows FSD (`entities`, `features`, `widgets`, `pages`, `processes`, `shared`); route files
in `app/` only compose pages.

Docs: [CRM](../../documentation/crm/README.md), [member cabinet](../../documentation/tasks/member-cabinet.md),
routes and auth — `CLAUDE.md` in the repo root.
