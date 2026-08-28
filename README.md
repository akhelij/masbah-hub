# Masbah.ma — Centralized Operations Hub

Command center for **Masbah.ma**, a Moroccan private-pool rental marketplace: CRM, outreach,
AI content generation, automations and analytics in one Next.js app.

> UI language is **French** (with darija/Arabic + RTL support), because that's who uses it daily.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Components) + TypeScript |
| Styling | Tailwind CSS v4 (`@theme` tokens, light/dark, RTL) |
| Database | PostgreSQL 16 + Prisma 6 |
| Auth | NextAuth v5 (Auth.js) — credentials + optional Google OAuth, JWT sessions, RBAC |
| AI | Anthropic SDK — `claude-opus-5` with adaptive thinking |
| Charts | Recharts |
| Validation | Zod on every write path |

Zero UI component libraries — the design system lives in `src/app/globals.css` + `src/components/ui/`.

---

## Quick start

```bash
cd masbah-hub
cp .env.example .env          # then set AUTH_SECRET (openssl rand -base64 32)
npm install
npm run setup                 # starts Postgres in Docker, pushes schema, seeds demo data
npm run dev                   # http://localhost:3100
```

Sign in with **admin@masbah.ma / masbah2026**.

`npm run setup` = `db:up` + `prisma db push` + `prisma db seed`. If you already have Postgres,
skip Docker and just point `DATABASE_URL` at it, then run `npm run db:push && npm run db:seed`.

> **Ports:** the app runs on **3100** and Postgres on **5433** (not 3000/5432) to avoid clashing
> with other local projects.

### Demo accounts

| Email | Password | Role |
|---|---|---|
| admin@masbah.ma | masbah2026 | ADMIN — full access, can delete |
| operator@masbah.ma | masbah2026 | OPERATOR — leads, messages, content |
| viewer@masbah.ma | masbah2026 | VIEWER — read only |

### Enabling AI

Set `ANTHROPIC_API_KEY` in `.env` and restart. **Without it the whole app still works** — only
the "Générer" buttons return a clear message. Model is configurable via `ANTHROPIC_MODEL`
(default `claude-opus-5`).

---

## Modules

| Route | What it does |
|---|---|
| `/dashboard` | KPIs, 30-day acquisition chart, conversion funnel, source split, top cities, overdue follow-ups, activity feed |
| `/leads` | Table **and** Kanban (drag & drop between statuses), filters, search, sort, bulk actions, CSV import/export |
| `/leads/[id]` | Full record: quick actions (WhatsApp / call / email), AI composer, message thread, activity timeline, pool details, notes, follow-up scheduling |
| `/messages` | Conversation inbox per lead + bilingual template library (FR / darija) with variable substitution |
| `/content` | AI post generator (FR + AR + hashtags + image prompt), library grid, 4-week content calendar, weekly idea generator |
| `/automations` | Rules engine (trigger → action), webhook log, copy-paste n8n endpoints |
| `/analytics` | Source performance, conversion by city, message reply rates, content engagement |
| `/settings` | Business info, team roster, live integration status |

---

## Lead scoring (0–100)

Every lead gets an automatic priority score, recomputed on every write (`src/lib/scoring.ts`).
Reachability is weighted highest — a lead you cannot contact is worthless no matter how good
the pool looks.

| Signal | Points |
|---|---|
| WhatsApp number | 25 (or 20 for phone only) |
| Priority city (Casa, Marrakech, Rabat, Dar Bouazza, Bouskoura) | 20 (other target city: 12) |
| Google rating ≥ 4.5 | 15 (≥4: 11, ≥3: 6) |
| Email / website / address / geo | 10 / 8 / 5 / 4 |
| `has-pool` tag | 10 · `villa`/`riad` tag: 5 |

Bands: **Chaud** ≥ 70 · **Tiède** ≥ 45 · **Froid** below.

---

## API

All `/api/*` routes require an authenticated session and return JSON (`401` when signed out).
Webhooks use an API key instead.

```
GET    /api/leads?q=&status=&city=&source=&tag=&sort=&page=&perPage=
POST   /api/leads
GET    /api/leads/[id]        PATCH /api/leads/[id]      DELETE /api/leads/[id]   (admin)
POST   /api/leads/bulk        # {ids, action: status|assign|tag|followUp|delete}
POST   /api/leads/import      # {csv, source, defaultCity, skipDuplicates}
GET    /api/leads/export      # CSV, honours the same filters

GET    /api/messages?leadId=&channel=&direction=
POST   /api/messages          # logs the message and advances the lead
POST   /api/messages/generate # AI, {leadId, tone, language, channel}

GET    /api/templates         POST /api/templates
PATCH  /api/templates/[id]    DELETE /api/templates/[id]

GET    /api/content           POST /api/content
PATCH  /api/content/[id]      DELETE /api/content/[id]
POST   /api/content/generate  # AI, {postType, platform, topic, language, save}
POST   /api/content/ideas     # AI, 7 weekly ideas

GET    /api/automations       POST /api/automations
PATCH  /api/automations/[id]  DELETE /api/automations/[id]

GET    /api/analytics?scope=dashboard|performance|all
GET    /api/settings          PATCH /api/settings   (admin)
```

### CSV import

Headers are auto-mapped, so a raw Google-Maps-scraper export usually works untouched.
Recognised aliases include `Title`/`nom`/`business_name` → name, `Phone Number`/`téléphone` → phone,
`Ville`/`locality` → city, `Note`/`stars` → rating, plus `address`, `website`, `maps_url`,
`latitude`, `longitude`, `categories`→tags and `search_query`. Duplicates are matched on
normalised phone, then email. Rows without a name are skipped and reported.

Moroccan phone numbers are normalised to E.164 on write (`0661…` → `212661…`), which is what
makes the one-click `wa.me` links work.

### Webhooks (n8n)

Authenticate with the `x-api-key` header (`WEBHOOK_API_KEY`, or any key row in the `ApiKey` table).

```bash
curl -X POST http://localhost:3100/api/webhooks/new-lead \
  -H "content-type: application/json" \
  -H "x-api-key: $WEBHOOK_API_KEY" \
  -d '{"name":"Villa Test","city":"Casablanca","phone":"0661234567","source":"GOOGLE_MAPS"}'
```

| Endpoint | Payload |
|---|---|
| `POST /api/webhooks/new-lead` | Lead fields — `name` + `city` required |
| `POST /api/webhooks/lead-status-change` | `{leadId \| phone, status, note?}` |
| `POST /api/webhooks/message-received` | `{phone, content, channel?, createLeadIfMissing?}` |

Every call is written to `WebhookLog` (success or failure) and visible at `/automations`.

### Automations

Rules are stored in the DB and evaluated on `LEAD_CREATED`, `LEAD_STATUS_CHANGED` and
`MESSAGE_RECEIVED`. Actions: `SEND_WEBHOOK` (outbound to n8n, 10s timeout, logged),
`CHANGE_STATUS`, `ADD_TAG`, `SCHEDULE_FOLLOW_UP`, `NOTIFY`. Optional JSON conditions —
`{"city":"Casablanca","toStatus":"CONTACTED","minScore":50}`.

Automation failures are caught and logged; they never break the request that triggered them.

---

## Project layout

```
prisma/schema.prisma      # 10 models, all enums from the spec
prisma/seed.ts            # 3 users, 12 leads, 6 templates, 15 messages, 3 posts, 3 automations
src/auth.ts               # Auth.js: providers + Prisma
src/auth.config.ts        # edge-safe half, used by middleware.ts
src/middleware.ts         # route protection
src/lib/
  prisma.ts  ai.ts  scoring.ts  csv.ts  leads.ts
  automations.ts  analytics.ts  activity.ts  validators.ts  api.ts  utils.ts
src/app/(app)/…           # authenticated pages
src/app/api/…             # route handlers
src/components/           # ui/ + layout/ + one folder per module
```

Pages read from Prisma directly in Server Components (fast, no HTTP hop); route handlers exist
for client mutations and for external tools like n8n.

---

## Deployment

**Vercel** — push the repo, set the env vars from `.env.example`, point `DATABASE_URL` at a
managed Postgres (Supabase / Neon). `npm run build` runs `prisma generate` first. Set
`AUTH_URL`/`NEXTAUTH_URL` and `APP_URL` to the production domain.

**Self-hosted** — `docker compose up -d` for Postgres, then `npm run build && npm start`
behind nginx.

Use `prisma migrate dev` instead of `db push` once you have production data.

---

## What's next (deliberately not built)

- **Map view** for leads — needs a tile provider; the lat/lng columns are already populated by the importer.
- **WhatsApp Business API** — env vars are wired and the message log is channel-aware; today outbound
  goes through `wa.me` deep links, which needs no Meta approval and works from day one.
- **Scheduled publishing** — posts carry `scheduledAt`; a cron job could push them to Meta's API.
- **Email sending** — SMTP vars are read and reported in Settings; messages are logged, not yet sent.
