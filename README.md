# House Hunt — a local-first off-market property dashboard

A self-hosted web app for tracking private (off-market) house-buying
opportunities — map, valuations, viewings, a transparent recommended-offer
engine, side-by-side comparison, per-person criteria scoring, and flood-risk
labels. Designed for one household to run on their own machine or a small
private server.

It ships with a New Zealand (Christchurch) flavour — Nominatim geocoding, deep
links to homes.co.nz / OneRoof / the Christchurch City Council rates & flood
viewers, and a Christchurch house-price index in the offer config — but the
structure is generic and easy to adapt to your area.

> ⚠️ **Single-household tool, not multi-tenant SaaS.** Locally it runs with no
> login. When deployed it's protected by a single **shared-password gate** — fine
> for a private household tool, not for a public multi-user service.

## Features

- **Dashboard** — card grid + Leaflet map, status-coloured pins, search/sort/filter.
- **Property detail** — photo, valuations with source badges, facts, sale history,
  notes timeline, due-diligence checklist, deep-link helpers.
- **Recommended-offer engine** — a transparent, tunable decision aid that reconciles
  the estimates and council valuation (never presented as a valuation or advice).
- **Recommended sale price** — once an offer and counter exist, suggests where to settle.
- **Viewings** — schedule, edit, mark completed with notes + rating; global agenda.
- **Criteria assessment** — each person scores every house against weighted criteria;
  inspection + compare views, disagreement/deal-breaker flags.
- **Compare** — all properties side by side ($/m², offers, beds/baths, flood risk),
  best-in-column highlighting, and a per-person criteria-fit table.
- **Flood-risk label** — record each property's risk from your local flood viewer.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **SQLite** via **Prisma** (single DB file = trivial backup)
- **Leaflet** + OpenStreetMap (maps), **Recharts** (charts)
- Optional, pluggable enrichment: **Nominatim** geocoding (free) and **Google
  Street View** static images (needs a key — off by default)

## The core design constraint

There is **no free, reliable, terms-compliant API** for NZ property valuations, CVs,
or sales history. So **manually-entered figures are the source of truth.** The app
generates one-click deep links to the lookup sites so you can read the numbers and
paste them in. Every field carries a **source badge** (manual / api / estimated).

Automated enrichment is **optional and best-effort** (geocoding, Street View).
**It does not scrape consumer property sites.**

## Getting started

```bash
npm install            # also runs `prisma generate` (postinstall)
cp .env.example .env    # the app runs with just DATABASE_URL
npm run db:migrate      # apply migrations / create the SQLite DB
npm run db:seed         # load the fictional sample data (optional but recommended)
npm run dev             # http://localhost:3000
```

The seed loads fictional sample opportunities with dummy valuations, flood risk,
offers, viewings, and criteria assessments so every feature has data to explore.

## Useful scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:migrate` | Create/apply a migration (`prisma migrate dev`) |
| `npm run db:seed` | Seed the fictional sample data |
| `npm run db:reset` | Drop and recreate the DB, then re-seed |
| `npm run db:studio` | Open Prisma Studio to inspect the DB |

## Environment variables

Copy `.env.example` to `.env`. The app runs fully with just `DATABASE_URL`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | SQLite connection string (`file:./prisma/dev.db`) |
| `GOOGLE_MAPS_API_KEY` | no | Google Street View Static API key. Leave blank to disable. |
| `STREETVIEW_ENABLED` | no | `"true"` to enable the Street View fallback image. Default `"false"`. |
| `NOMINATIM_CONTACT_EMAIL` | no | Contact email sent to Nominatim per its usage policy. |
| `APP_PASSWORD` | prod | Shared password for the login gate. Leave blank locally; **required in production**. |
| `AUTH_SECRET` | prod | Random string that signs the session cookie. `openssl rand -base64 32`. **Required in production**. |

## Deploying

The app is a long-running Node server with a **SQLite file** and **photo uploads**
that need a persistent disk, so deploy it to a container host with a volume (e.g.
Fly.io, Railway, Render) — not classic serverless. A `Dockerfile` and an example
`fly.toml` are included.

```bash
# Fly.io example — set your own app name in fly.toml first
fly launch --no-deploy --copy-config --name <your-app-name>
fly volumes create househunt_data --size 1 --region <your-region>
fly secrets set APP_PASSWORD="a-strong-shared-password" AUTH_SECRET="$(openssl rand -base64 32)"
fly deploy
```

The container runs migrations and seeds people + criteria on boot, and the login
gate is enforced in production (it refuses to start without `APP_PASSWORD` +
`AUTH_SECRET`). For per-person SSO you can optionally put Cloudflare Access in front.

## Adapting it to your area

- **Offer engine & house-price assumptions:** `src/lib/offer/config.ts`.
- **Deep-link lookup sites & flood viewer:** `src/lib/links.ts`.
- **Default criteria & flood-risk levels:** `src/lib/enums.ts`.

## This is a decision aid, not advice

The recommended offer / sale price are transparent, tunable negotiation starting
points — **not a valuation and not financial advice.** Always commission a
registered valuation, LIM, and builder's report before committing.

## License

[MIT](./LICENSE).
