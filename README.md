# Business Tracker

A self-hosted tracker for the business side of your digital life, in two independent modules:

- **Subscriptions** — Wallos-style subscription tracker: billing cycles, renewal calendar, cost stats and charts, budget, household members, multi-currency with daily ECB rates, and renewal reminders via Email (SMTP), Discord, Slack, Telegram, or a generic webhook.
- **Email** — which email address you used for which app, with favicons, categories, and CSV export.

Stack: Next.js 16 (App Router) + shadcn/ui + Tailwind v4, Postgres + Drizzle ORM, Better Auth (**first account created becomes the owner, then sign-up closes**).

## Local development

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d   # Postgres on localhost:5433
cp .env.example .env                              # defaults already match the dev db
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000 — you'll be sent to sign-up to create the owner account.

### Database migrations

Schema lives in `src/db/schema.ts`. After changing it:

```bash
pnpm db:generate   # writes a new SQL migration into drizzle/
pnpm db:migrate    # applies it locally
```

In production, migrations run automatically on every container start (`docker/entrypoint.sh`), so deploying a commit with a new migration is all that's needed.

## Scheduled jobs

A scheduler inside the server (started from `src/instrumentation.ts`) sweeps every 15 minutes and runs each job at most once per day:

- `advance-payments` — moves past-due renewal dates forward by whole billing cycles
- `refresh-fx` — refreshes currency rates from Frankfurter (ECB, no API key)
- `send-notifications` — sends "renews in N days" reminders (after 09:00 server time)

Trigger any job manually:

```bash
curl -X POST -H "x-cron-secret: $CRON_SECRET" \
  "https://<your-domain>/api/cron/advance-payments?force=1"
```

## Full stack with Docker

```bash
docker compose up --build
```

## Deploy on Coolify (build from source)

Coolify builds the image straight from this repo — no registry involved.

1. In Coolify, create a resource from the GitHub repo (branch `main`) with the **Docker Compose** build pack, compose file location `coolify.compose.yml`.
2. Coolify auto-generates `SERVICE_PASSWORD_POSTGRES`, `SERVICE_BASE64_64_AUTHSECRET`, `SERVICE_BASE64_64_CRONSECRET`, and the FQDN variable — set your domain on the `business-tracker` service (port 3000).
3. Deploy. Migrations run on boot; open the domain and create your owner account.

To update: push to `main`. With the Coolify GitHub App the webhook redeploys automatically; otherwise add the resource's webhook URL under GitHub → Settings → Webhooks (push events), or redeploy manually in Coolify.

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Random 32+ char secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Public URL the app is served from |
| `CRON_SECRET` | Secret for manually triggering `/api/cron/*` jobs |
| `TZ` | Optional. Timezone for the 09:00 notification gate (default UTC) |

## Notes

- Sign-up is open only while the database has zero users. The first account gets the `admin` role; every later attempt is rejected server-side.
- An email can't be deleted while apps still reference it; categories/currencies/payment methods in use by a subscription can't be deleted either.
- Subscription logos are fetched from the subscription's website URL and cached in the database.
