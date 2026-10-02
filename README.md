# Email Tracker

A tiny self-hosted app to track **which email you used for which app**. If you juggle multiple emails (business, personal, …) and sign up for services with different ones, this keeps the mapping in one place — Wallos-style UI, no passwords stored.

- Next.js 16 (App Router) + shadcn/ui + Tailwind v4
- Postgres + Drizzle ORM (migrations run automatically on container start)
- Better Auth — the **first account created becomes the owner, then sign-up closes**
- Favicons are fetched once from each app's URL and cached in the database
- Dark mode, search, filtering by email/category, grid & list views

## Local development

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d   # Postgres on localhost:5433
cp .env.example .env                              # defaults already match the dev db
pnpm drizzle-kit migrate
pnpm dev
```

Open http://localhost:3000 — you'll be sent to sign-up to create the owner account.

## Full stack with Docker

```bash
docker compose up --build
```

## Deploy on Coolify (GHCR image)

Every push to `main` builds and pushes `ghcr.io/alisamadiii/email-tracker:latest` via GitHub Actions.

1. In Coolify, create a **Docker Compose** resource and paste `coolify.compose.yml`.
2. Coolify auto-generates `SERVICE_PASSWORD_POSTGRES`, `SERVICE_BASE64_64_AUTHSECRET`, and the FQDN variable — set your domain on the `email-tracker` service (port 3000).
3. Deploy. Migrations run on boot; open the domain and create your owner account.

To update: push to `main`, wait for the Action, then redeploy in Coolify (or enable auto-pull).

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Random 32+ char secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Public URL the app is served from |

## Notes

- Sign-up is open only while the database has zero users. The first account gets the `admin` role; every later attempt is rejected server-side.
- An email can't be deleted while apps still reference it — reassign or delete those apps first.
