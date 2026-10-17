# PICT Robotics Club

Existing React 19 / Vite / Tailwind frontend, connected to Supabase Auth, PostgreSQL/RLS and Storage. The original visual system, public pages, applicant portal and admin routes are preserved.

## Run locally

Requires Node 22+, pnpm and Docker Desktop. Run from this repository:

```sh
pnpm install --frozen-lockfile
pnpm exec supabase start -x studio,realtime,logflare,vector,supavisor,edge-runtime,imgproxy,postgres-meta
pnpm exec supabase migration up --local
pnpm dev:local
```

Open [the local app](http://127.0.0.1:5173). The dedicated local API uses port 55421, PostgreSQL 55422, and the test email inbox [55424](http://127.0.0.1:55424). Local email confirmation is disabled for automated testing; this is **not** the recommended production setting. No default admin password exists.

`pnpm dev` preserves the original port-8443 workflow and reads `.env.local`, falling back to the repository's existing hosted public Supabase configuration. It does **not** automatically use the isolated test database. New hosted migrations must be deployed before the new features work against that project.

## Verify

```sh
pnpm typecheck
pnpm test
pnpm test:database
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

Database tests create and remove their own disposable, network-isolated PostgreSQL container. Browser/API tests only accept the dedicated local Supabase endpoint; they cannot run against a hosted URL. Stop `pnpm dev:local` before the browser suite, which starts its own Vite server on 5173.

## Implemented workflows

- One shared login for all account roles, applicant-only signup, session restoration, password recovery, profile and private documents. See [account roles](docs/ACCOUNT_ROLES.md).
- Persistent application drafts, configurable questions/preferences, atomic submission and server-enforced deadlines.
- Admin applicant review, staff search/filtering, notes, interviews, evaluations, notifications and results.
- Super-admin-only staff provisioning and role management; applicant/admin/super-admin roles. Recruiter and application audit/activity features are retired without deleting historical records.
- Persistent CMS for achievements, projects, events, announcements, team, gallery, homepage highlights, campaigns, rounds, questions, domains and tasks.

Member messages deliver **in-app notifications**, not external email. Production Auth SMTP is configured; real inbox delivery still needs verification.

See [Render deployment and admin operations](docs/RENDER_DEPLOYMENT.md), [Supabase setup](docs/SUPABASE_SETUP.md), [feature/security inventory](docs/backend-feature-inventory.md), and [verification report](docs/IMPLEMENTATION_REPORT.md). The 2026-10-17 hosted preflight verified the designated super admin and all 16 migrations are applied, including role/activity retirement. Consult the release report for frontend deployment status; local test completion alone does not prove a live release.
