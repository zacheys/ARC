# ARCTrack

**Architectural Review Committee request tracking for Texas HOAs.**

ARCTrack tracks every architectural request against the procedural deadlines in
**Texas Property Code §209.00505** so a missed step never costs your association
its ability to enforce a decision:

- A denial must be in **writing with specific reasons** and describe **what
  changes would gain approval**.
- The homeowner has **30 days** from the denial notice to request a board hearing.
- The board must **hold that hearing within 30 days** of the request.

ARCTrack computes each of these clocks, color-codes them by urgency, generates a
compliant denial letter (HTML + PDF), and emails the committee about anything
due soon or overdue.

> **This tool assists with deadline tracking and does not constitute legal
> advice. Consult your association's attorney and governing documents.**

---

## Features

- **Public request form** (`/submit/[slug]`) — no login. Photo/document uploads
  to Vercel Blob, reference number, confirmation page, and confirmation +
  committee notification emails.
- **Committee dashboard** (`/dashboard/[slug]`, password-protected) — requests
  color-coded by urgency (green > 14 days, yellow 7–14, red < 7 / overdue),
  detail pages with photos, a status timeline, and an activity log.
- **Status workflow** — `PENDING → UNDER_REVIEW → APPROVED / DENIED`, and for
  denials `APPEAL_REQUESTED → HEARING_SCHEDULED → APPEAL_RESOLVED`.
- **Deadline engine** — review deadline (configurable per HOA), 30-day appeal
  window, 30-day hearing deadline.
- **Denial letter generator** — requires the statutorily mandated reasons +
  required changes + delivery method; renders an HTML letter and a downloadable
  **PDF** with the 30-day hearing-rights paragraph.
- **Records archive** — every request, searchable/filterable by address, type,
  status, and date range.
- **Email reminders** — a secured cron endpoint emails the committee about
  deadlines within 7 days or overdue (wired for Vercel Cron).
- **Settings** — HOA name, committee emails, review-deadline days, letterhead
  logo, and committee password.
- **Multi-HOA** — each association has its own URL slug and committee password.

## Tech stack

Next.js (App Router) · Tailwind CSS · Prisma · Postgres (Neon, serverless
pooling) · Vercel Blob · Resend · `@react-pdf/renderer`. No auth provider —
per-HOA password with a signed session cookie.

---

## Local setup

### 1. Prerequisites

- Node.js 20+ (developed on Node 22/25)
- A free [Neon](https://neon.tech) Postgres database

### 2. Create a Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. In the project dashboard, open **Connection Details**.
3. Copy the **pooled** connection string (the host contains `-pooler`). Prisma
   is configured for serverless, so use the pooled string as `DATABASE_URL`.

### 3. (Optional) Create a Vercel Blob store

File uploads (request photos and the letterhead logo) use Vercel Blob.

1. In the [Vercel dashboard](https://vercel.com) → **Storage** → **Create
   Database** → **Blob**.
2. Copy the **`BLOB_READ_WRITE_TOKEN`**.

Without this token the app still runs — uploads are simply disabled and noted in
the activity log.

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` and generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use that for `AUTH_SECRET` and again for `CRON_SECRET`.

### 5. Install, migrate, seed

```bash
npm install
npm run db:push      # create tables in Neon
npm run db:seed      # load 8 sample requests across 2 HOAs
npm run dev
```

Open <http://localhost:3000>.

- **Public form:** `/submit/oak-ridge` or `/submit/lakeside`
- **Dashboard:** `/dashboard/oak-ridge` (password from `SEED_COMMITTEE_PASSWORD`,
  default `committee123`)

---

## Environment variables

| Variable                  | Required | Purpose                                                                                   |
| ------------------------- | :------: | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`            |   Yes    | Neon Postgres **pooled** connection string.                                               |
| `AUTH_SECRET`             |   Yes    | Signs committee session cookies. Any long random string.                                  |
| `CRON_SECRET`             |   Yes\*  | Bearer token that secures `/api/cron/reminders`. Required for reminders.                  |
| `BLOB_READ_WRITE_TOKEN`   |    No    | Vercel Blob token. Enables photo + logo uploads. Uploads disabled if unset.               |
| `RESEND_API_KEY`          |    No    | Resend key. **If unset, emails are logged to the console instead of sent.**               |
| `EMAIL_FROM`              |    No    | From address for outgoing email (must be a Resend-verified domain in production).         |
| `SEED_COMMITTEE_PASSWORD` |    No    | Password the seed sets for each sample HOA. Default `committee123`.                       |
| `NEXT_PUBLIC_APP_URL`     |    No    | Absolute base URL used in emails/letters. Auto-detected on Vercel.                        |

\* The reminder endpoint fails closed (401) if `CRON_SECRET` is not set.

> **Note on the original spec's `COMMITTEE_PASSWORD`:** because you chose
> **multi-HOA with per-HOA passwords**, there is no single shared password env
> var. Each HOA stores its own hashed password (set by the seed, rotatable on the
> Settings page). Cookie signing uses `AUTH_SECRET`.

---

## Email

ARCTrack sends: homeowner confirmation, committee new-submission notification,
approval notice, and deadline reminders.

- **Dev (no `RESEND_API_KEY`):** every email is printed to the server console —
  the app is fully functional without an email account.
- **Production:** set `RESEND_API_KEY` and an `EMAIL_FROM` on a
  [Resend](https://resend.com)-verified domain.

## Reminder cron

`GET /api/cron/reminders` scans all active requests and emails each HOA's
committee about deadlines within 7 days or overdue.

- Secured by `CRON_SECRET` via `Authorization: Bearer <CRON_SECRET>` (or
  `?secret=` for manual testing).
- [`vercel.json`](vercel.json) schedules it daily at 13:00 UTC. Vercel Cron
  automatically sends the `CRON_SECRET` as the bearer token.

Test locally:

```bash
curl "http://localhost:3000/api/cron/reminders?secret=YOUR_CRON_SECRET"
```

---

## Deploy to Vercel

1. Push this repo to GitHub and **Import Project** in Vercel.
2. Add the environment variables above in **Settings → Environment Variables**
   (`DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, and optionally
   `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM`).
   - If you create the Blob store from the Vercel Storage tab and link it to the
     project, `BLOB_READ_WRITE_TOKEN` is injected automatically.
3. Deploy. The build runs `prisma generate` automatically.
4. Apply the schema to your database once (from your machine, with the same
   `DATABASE_URL`):
   ```bash
   npm run db:push
   npm run db:seed   # optional demo data
   ```
5. The cron in `vercel.json` is registered on deploy — no extra setup.

---

## Project structure

```
prisma/
  schema.prisma          # Hoa, Request, Attachment, Activity + enums
  seed.ts                # 8 demo requests across 2 HOAs
src/
  middleware.ts          # protects /dashboard/[slug] (Edge, Web Crypto)
  lib/                   # deadlines, email, blob, auth/session, letter, PDF
  components/            # shared UI (shell, badges, deadline pill, footer)
  app/
    submit/[slug]/       # public form + confirmation
    dashboard/[slug]/    # login, active table, detail, archive, settings
      requests/[id]/     # detail, workflow actions, denial letter (HTML+PDF)
    api/cron/reminders/  # secured reminder endpoint
```

## Available scripts

| Script            | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start the dev server                     |
| `npm run build`   | `prisma generate` + production build     |
| `npm run db:push` | Push the Prisma schema to the database   |
| `npm run db:seed` | Seed demo data                           |
| `npm run db:studio` | Open Prisma Studio                     |
