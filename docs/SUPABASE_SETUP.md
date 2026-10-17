# Supabase setup and safe deployment

## What is and is not deployed

The repository's existing public configuration points to project `ycsqqktwzvqqblarqpfi`. A read-only REST check on 2026-10-17 found the existing “FY & SY Recruitment 2026” campaign. Its `status` was `open`, but its closing date was 2026-09-30. The new application checks both status and dates; it correctly does not accept applications for that expired campaign.

Release update, 2026-10-17: authenticated preflight confirmed the designated account is an active, verified super admin. Public schema/data backups were saved privately under ignored `.backups/`; the eight reviewed completion migrations were then applied successfully to the specified project. All 15 versions match. The eight profiles, existing application, two invitations and existing roles were preserved; CMS seed migrations added only the frontend content they were designed to preserve. No reset or vault-secret synchronization was performed. Render/Auth release checks are recorded separately in `RENDER_DEPLOYMENT.md` and the implementation report.

Do not send access tokens, service-role keys, database passwords or SMTP credentials in chat. Authenticate/configure them on your computer or through the Supabase Dashboard.

## 1. Dedicated local environment

With Docker Desktop running:

```sh
pnpm install --frozen-lockfile
pnpm exec supabase start -x studio,realtime,logflare,vector,supavisor,edge-runtime,imgproxy,postgres-meta
pnpm exec supabase migration up --local
pnpm dev:local
```

The initial start downloads Docker images. The local CLI configuration uses PostgreSQL 17 and intentionally non-default ports so it does not collide with another Supabase project:

| Service | Local address |
| --- | --- |
| App | http://127.0.0.1:5173 |
| Supabase API | http://127.0.0.1:55421 |
| PostgreSQL | 127.0.0.1:55422 |
| Test email inbox | http://127.0.0.1:55424 |

`dev:local` obtains the **local public key** from CLI status in memory. It does not write credentials to the repository. Browser tests read the local service key only in the Node test process to create/delete their own fixtures; the key is never passed to Vite.

Email confirmation is disabled locally. Password-reset messages go to the local inbox, not external recipients. To make yourself a local admin, register your own account in this local app and use the trusted SQL scripts below against the local database, changing the email to your local account if necessary. There are no hard-coded accounts/passwords.

`pnpm exec supabase stop` stops this project's local stack and normally retains its data. Do not use `--no-backup`, `db reset`, Docker volume deletion, or a hosted reset as a routine setup step.

## 2. Check the existing super-admin account

In the **intended hosted project's** SQL editor, run `supabase/manual/verify-super-admin.sql` after replacing its explicit email placeholder with the intended account. The first query is read-only and checks the actual Auth user ID, confirmation/ban/deletion state and database roles. The repository does not publish a real admin account email or password.

- If it returns `super_admin` on the active, verified account, nothing needs adding. Sign in through `/admin/login` after migrations are deployed.
- If it returns only `applicant` or no roles, use `supabase/manual/bootstrap-super-admin.sql` in the trusted SQL editor **once**, after checking the account identity. It adds `super_admin` without removing any existing role/records. Audit triggers record role changes.
- If it returns no account, create the account through normal Auth and verify its email first. Do not invent an Auth user UUID or manually insert password data.
- Adding `role` to Auth user metadata does not grant privileges. Application authorization reads `public.user_roles`.

After the first super admin is established, use `/admin/settings` as a super admin to create/revoke staff invitations or change account roles. Supported roles are applicant, admin and super_admin; admins perform all recruitment-review duties. Only super admins provision staff or manage roles. Self-demotion is blocked; another super admin must perform it. SQL-editor operators can bypass application safeguards and must not remove the last super admin.

## 3. Inspect hosted history before applying migrations

First take a current backup using your normal Supabase backup procedure. Then authenticate locally:

```sh
pnpm exec supabase login
pnpm exec supabase link --project-ref ycsqqktwzvqqblarqpfi
pnpm exec supabase migration list --linked
pnpm exec supabase db push --dry-run
```

Enter the project database password only at the CLI's local prompt if requested. Login requires a Supabase personal access token or the interactive browser flow; link requires access to the intended project. Use a different project reference only if deliberately changing the deployment target.

**Stop if old migrations are listed pending while their tables already exist.** Existing Dashboard-created schema and migration history must be reconciled first. Do not blindly replay the initial migrations, use `--include-all`, or mark migrations applied without verifying that the actual definitions match. Capture/review any remote-only schema changes in a separate controlled checkout before merging; do not blindly add a full remote-schema dump after the existing creation migrations.

In particular, the pre-existing `202609260001_fix_orphaned_profiles.sql` installed a profile trigger with an email-conflict deletion fallback. The new `202610170001_complete_workflows.sql` replaces that function with a non-destructive implementation. Do not leave the old trigger as the final deployed version or resolve conflicts by deleting user profiles.

New implementation migrations, in order:

| Version | Purpose |
| --- | --- |
| 202610170001 | Safe profile bootstrap, scoped review, draft/submit/status RPCs, tasks, scheduling, evaluations, notifications, storage and audit |
| 202610170002 | Role-scoped invitation visibility |
| 202610170003 | Preserve the existing frontend's achievements/projects as CMS records |
| 202610170004 | Evaluation/notification integrity and recruitment-history protection |
| 202610170005 | Team, gallery, homepage CMS; preserve the existing public content |
| 202610170006 | Token-specific invitation preview without exposing invitation lists/secrets |
| 202610170007 | Serialized role management, safe audit metadata, question configuration and indexes |
| 202610170009 | Retires recruiter and app activity logging; admin-only review, super-admin-only provisioning, private historical retention and independent notification retry receipts |
| 202610170008 | Optional-answer/domain revalidation and banned-account enforcement for existing JWTs |

The existing `202609260002_fix_audit_trigger.sql` is also retained. All repository migrations must have matching verified hosted history; deploying only the last file is insufficient. New content-preservation migrations copy claims already present in the frontend, not independently verified club statistics. Review those CMS entries before launch.

When the dry run lists only the intended, reviewed pending migrations:

```sh
pnpm exec supabase db push
pnpm exec supabase migration list --linked
```

This guide does not authorize an automated production reset. Deploy database changes before the matching frontend. If a migration fails, inspect the exact error and history; correct it with a forward migration instead of deleting data or repeatedly replaying files.

See Supabase's [migration workflow](https://supabase.com/docs/guides/local-development/database-migrations) for linking and existing-schema reconciliation.

## 4. Production Auth and email settings

In Supabase Authentication:

1. Enable email/password signup and require email confirmation for production.
2. Set Site URL to the real HTTPS website origin.
3. Add the exact deployed `/signin`, `/reset-password`, and invitation-acceptance `/admin/signup` redirect destinations. Invitation verification must preserve `?invite=<token>`; use a narrowly scoped `/admin/signup**` allow-list pattern if necessary for those query strings. Configure each approved preview origin separately; do not allow arbitrary hosts. On 2026-10-17, the production origin was correct but these paths were missing; the reviewed sparse config at `deploy/production-auth/supabase/config.toml` added them. Post-update comparison confirmed unrelated SMTP, confirmation, MFA and other settings were unchanged.
4. If email templates were customized, ensure their verification links honor the requested `RedirectTo` rather than always forcing Site URL.
5. Configure a production SMTP provider (host, port, user, password, sender email/name), verified sender/domain and appropriate Auth rate limits. Production inspection on 2026-10-17 confirmed custom Gmail SMTP is already enabled and email confirmation is required; credentials were preserved, not displayed or replaced. Test signup verification and password reset with a real controlled inbox: configuration alone does not establish successful delivery.
6. Decide and configure MFA/organization access requirements for staff in accordance with the club's operational policy. This build does not add a custom MFA enrollment UI.

Check the official [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls) and [custom SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp). Hosted email delivery, spam placement and production verification are not established by the local inbox test.

Invitation creation returns a link for the admin to copy and share with the intended recipient. It does **not** claim to send an invitation email. Links expire after seven days in the UI, store only a token hash, require a matching confirmed account, and cannot be reused/revoked/expired or accepted after the inviter loses authority.

Member Mail currently delivers idempotent **in-app notifications** to selected registered accounts (up to 200 per request). External member-email delivery is not implemented; adding it requires a server-side provider integration, credentials and delivery tracking. No placeholder “email sent” success state remains.

## 5. Storage

Migrations configure:

- `club-media`: public club images; JPG/PNG/WebP, 5 MB maximum; admin upload under their UUID folder, admin deletion.
- `private-applicant-files`: private PDF/JPG/PNG, 5 MB maximum; owners upload/delete their files; owners and admins/super admins can read. Recruiters do not get document access merely from an application assignment.

Private documents use 60-second signed URLs. Public images use unique non-overwriting paths. CMS replace/delete removes managed old images only after checking other database references. External URLs and still-shared images are preserved. Files selected but not saved are not uploaded. A failed cleanup is surfaced as a warning; periodically inspect storage for orphaned uploads, especially after interrupted requests. Database writes and Storage deletion cannot share a single database transaction.

Do not mark the private bucket public or disable RLS. If existing bucket settings differ, review them explicitly: creation uses `ON CONFLICT DO NOTHING` to avoid overwriting an existing public-media bucket's settings.

## 6. Frontend deployment

Copy the names in `.env.example` into your deployment's environment configuration (or `.env.local` for local hosted-backend development):

```dotenv
VITE_SUPABASE_URL=https://ycsqqktwzvqqblarqpfi.supabase.co
VITE_SUPABASE_ANON_KEY=<public anon or publishable key for that project>
```

Use the project's **public** API key only. Never use a service-role/secret key or a database password here. Rebuild after changing Vite variables. Preserve `utils/supabase/info.tsx` compatibility unless intentionally removing the old hosted fallback.

```sh
pnpm typecheck
pnpm test
pnpm build
```

Deploy `dist/` using the existing hosting workflow. Configure SPA history fallback to `index.html` for `/projects/*`, `/dashboard/*`, `/admin/*`, `/reset-password` and other frontend routes, without rewriting static assets. Use HTTPS. Existing Figma Make plugins remain in Vite configuration. No new Edge Function deployment is required: trusted PostgreSQL RPCs implement privileged transactions; the old health-only Figma server is retained but no longer relied on by these workflows.

## 7. Launch smoke test (hosted, non-destructive)

Use controlled test accounts in a deliberately created test campaign, not real applicant records:

1. Confirm migrations/history and RLS are current, verify the super-admin account, then log in at `/admin/login`.
2. Create an open campaign with future closing date, active domains and valid questions/options. Archive expired campaigns rather than pretending they are open. Do not delete campaigns/questions with historical applications.
3. Register a separate applicant, complete real email verification, save a draft, refresh, submit, and sign out/in. Verify the persisted application.
4. Invite a separate admin; verify acceptance, review/interview/evaluation access, and denied access to super-admin settings/role grants. Demote the account and verify backend review access disappears immediately; reviewer assignment alone must not grant access.
5. Review → shortlist → schedule → evaluate → select/waitlist/reject; confirm applicant-safe interview details, result and notifications. Check the selected campaign filter.
6. Publish/unpublish a clearly labeled CMS test entry and verify public visibility; clean up only that entry. Test public image and private document permissions with separate users.
7. Exercise password reset through a real inbox. Verify browser refresh on deep links and a mobile viewport.
8. Confirm no audit/activity feed or recruiter option exists, retired roles cannot be granted by direct API requests, no new app audit entries appear and no service credentials enter the browser bundle. Historical activity stays private; notification retries remain idempotent.

Local automated tests do not replace this hosted launch check. Production backups, traffic/load testing, email delivery and deployment-domain behavior remain operator responsibilities.
