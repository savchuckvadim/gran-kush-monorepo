# Infra

Docker setup for Gran Kush.

```
infra/
├── compose/
│   ├── docker-compose.dev.yml     # dev: Postgres + Redis only
│   ├── docker-compose.prod.yml    # prod: full stack + nginx
│   ├── .env.example               # compose vars (copy → .env)
│   └── env/
│       └── api.env.example         # API runtime secrets (copy → api.env)
└── docker/
    ├── api.Dockerfile              # NestJS API
    ├── api-entrypoint.sh           # migrate (+optional seed) → start
    ├── next.Dockerfile             # generic Next.js app (crm/web/admin)
    └── nginx/templates/
        └── default.conf.template   # host-based routing
```

## Dev — databases only

Bring up Postgres + Redis; run the apps on the host with `pnpm dev`.

```bash
pnpm docker:dev          # or: docker compose -f infra/compose/docker-compose.dev.yml up -d
pnpm docker:dev:down
```

- Postgres → `localhost:5432`, Redis → `localhost:6379` (override with `POSTGRES_PORT` / `REDIS_PORT`).
- Defaults (`kush`/`kush`/`bro-crm`) match `apps/api/.env`. To reuse those values:
  `docker compose --env-file apps/api/.env -f infra/compose/docker-compose.dev.yml up -d`.
- Data persists in the `postgres_data` / `redis_data` volumes.

> Note: if another project already holds port `6379`, either stop it or set `REDIS_PORT`.
>
> Careful: the plain `docker compose -f ... up -d` form above ignores `apps/api/.env`, so a custom
> `REDIS_PORT` there is **not** applied and the container ends up on a different port than `REDIS_URL`
> expects — the API then fails with `ECONNREFUSED` against a perfectly healthy container.
> Prefer `pnpm docker:dev`, which always passes `--env-file apps/api/.env`.

## Prod — full stack

Services: `postgres`, `redis`, `api` (:3000), `crm` (:5000), `web` (:5001),
`admin` (:5002), `nginx` (:80). Only nginx is published to the host; everything
else talks over the internal Docker network. nginx routes by `Host`:

| Host         | → service    |
|--------------|--------------|
| `API_HOST`   | `api:3000`   |
| `CRM_HOST`   | `crm:5000`   |
| `WEB_HOST`   | `web:5001`   |
| `ADMIN_HOST` | `admin:5002` |

### 1. Configure

```bash
cp infra/compose/.env.example        infra/compose/.env
cp infra/compose/env/api.env.example infra/compose/env/api.env
# edit both: Postgres password, JWT secrets, mail, AWS, domains, NEXT_PUBLIC_* URLs
```

`NEXT_PUBLIC_*` are baked into the browser bundles at **build** time, so they must
be the public URLs (e.g. `https://api.el-gran-kush.ru`), not internal hostnames.
Change them → rebuild the frontend images.

### 2. Build & run

```bash
pnpm docker:prod         # build + up -d, runs `prisma migrate deploy` on api start
pnpm docker:prod:down
```

Or directly:

```bash
docker compose --env-file infra/compose/.env \
  -f infra/compose/docker-compose.prod.yml up -d --build
```

### 3. First deploy — seed the platform admin

Migrations run automatically (`RUN_MIGRATIONS=true`). To also seed the bootstrap
admin, either set `RUN_SEED=true` in `infra/compose/.env` for the first boot, or
run it once:

```bash
docker compose -f infra/compose/docker-compose.prod.yml \
  exec api pnpm prisma:seed:admin
```

### TLS

The nginx config serves plain HTTP on `:80`. For HTTPS, terminate TLS upstream
(cloud LB / Cloudflare), or mount certs and add a `443` server block:
uncomment the `443` port and `certs` volume in `docker-compose.prod.yml`, drop
your certs into `infra/docker/nginx/certs/`, and add `listen 443 ssl;` +
`ssl_certificate*` directives to the template.

## Notes

- **API image** keeps dev dependencies so `prisma migrate deploy` and the ts-node
  admin seed can run at start. Frontend images use Next standalone output and are
  small.
- Toggle startup behaviour via `RUN_MIGRATIONS` / `RUN_SEED` (compose `.env`).
- Rebuild a single service: `docker compose ... build api && docker compose ... up -d api`.
