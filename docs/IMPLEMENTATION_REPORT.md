# Implementation and verification report

Date: 2026-10-17. Deployment repository: `nahArnav/PICT_Robotics`.

## Production release update

The deployment repository is `nahArnav/PICT_Robotics`, confirmed against the local remote and Render's existing static service `srv-daramg7pn0mc738ojqbg`. Authenticated preflight verified the designated super admin, all seven earlier migrations, no missing/mismatched profiles and RLS on every public table. Private schema/data backups were saved in ignored `.backups/`; all eight completion migrations were then applied successfully. Existing profiles (8), applications (1), invitations (2) and roles were preserved. All 15 migration versions now match.

The release build additionally passed production environment validation, TypeScript, **8 unit tests**, and **10 local end-to-end tests** (40.0 seconds), including a regular admin creating/opening/closing recruitment, respecting a single-preference limit and preserving a draft after closure. The UI now explains why Continue is disabled, offers profile/recruitment navigation, shows campaign date validity, and provides explicit open/close controls.

Render's existing root page responds 200, but its pre-release `/admin/login` returned 404. The required rewrite and build/environment settings are documented in `RENDER_DEPLOYMENT.md` and `render.yaml`. Native browser control hit display-capture/time-out errors before the rewrite could be confirmed saved. Frontend deployment verification and production Auth/email checks remain in progress; the sections below describe the earlier local-only handoff, not the current database deployment state.

## Outcome

The existing frontend is connected to Supabase across public content, applicant and admin workflows. This is a locally implemented and integration-tested application, **not a claim that production has been deployed**. No hosted schema, account, role, record, storage object or Auth setting was changed.

React/Vite/Tailwind, branding, animation assets and existing public/portal routes remain. Operational screens use database data with loading/error/empty states. Demo credentials, fake operational data and missing custom-endpoint success paths were replaced. Existing public content was preserved as CMS records, not replaced with newly invented club claims.

## Delivered

- Eight incremental completion migrations, typed services and trusted transactional RPCs; existing migration history and the pre-existing audit fix are preserved.
- Real applicant/admin login, session restoration, role-aware routes, logout, password recovery, and trusted applicant-only profile/default-role bootstrap.
- Invitation-only staff acceptance for new/existing confirmed matching accounts, hashed one-use secrets, expiry/revocation and inviter-authority rechecks.
- Current database role enforcement, assigned recruiter scope, super-admin role management, audit history and banned-account restrictions for existing JWTs. Concurrent role changes retain a super admin.
- Applicant profile/private documents, persistent five-step drafts, configurable question types and one-to-three domain preferences, FY/SY handling, atomic submission, duplicate prevention and server deadlines.
- Real tasks, application/interview progress, notifications, announcements and results, including refresh/logout/login persistence.
- Staff search/filtering/pagination, campaign metrics, private notes, reviewer assignment/removal, admin document visibility, status transitions, interviews/rescheduling/cancellation and evaluations.
- CMS CRUD, publish/feature/order controls for achievements, projects, events, announcements, team, gallery and homepage highlights; campaign/round/question/domain/task configuration.
- Validated images/private files, deferred image upload, unique paths, signed private URLs and reference-aware cleanup that preserves shared/external images.
- Idempotent member **in-app notifications**, honestly labeled rather than pretending to send external email.
- Safe local test infrastructure, environment template, screen-by-screen inventory and precise hosted deployment/first-super-admin instructions.

## Executed verification

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Passed: application and test/config TypeScript |
| `pnpm test` | 3 unit tests passed |
| `pnpm test:database` | All 15 migrations applied to a disposable network-isolated PostgreSQL 16 container; 78 workflow/security assertions passed |
| Local Supabase migrations | Applied successfully to the dedicated real Supabase PostgreSQL 17 stack |
| `pnpm test:e2e` | Final full run: 9 tests passed in 33.5 seconds using local Auth/PostgREST/Storage and Chromium |
| `pnpm build` | Passed; large-chunk warning remains |
| `pnpm peers check` | No peer dependency issues |
| `git diff --check` | Passed |

No lint script was configured; no lint pass is claimed. The old Oxfmt 0.2 corrupted TypeScript type-member separators during formatting. Source was repaired, Oxfmt upgraded to 0.73, and the formatted result passed checks. React/React DOM remain major 19 and now satisfy the existing React Router peer requirement.

The expanded SQL suite exposed a test-harness startup race: it connected to PostgreSQL's temporary initialization server. The harness now waits for the final TCP server and the full SQL suite passed. A mobile test exposed CMS intrinsic-grid-width overflow; zero-minimum grid tracks fixed it, and the mobile/browser suite passed afterward.

### Nine browser/API cases

1. CMS create/publish/update/unpublish/delete reflected publicly; achievement/event/announcement publication; image upload, shared-image retention and last-reference cleanup.
2. New and existing staff accept real invitation links; recruiters cannot open settings.
3. Real local recovery email → password change → login; private document upload/refresh/delete.
4. Anonymous route protection, 390×844 mobile navigation/layout, simulated backend failure and working Retry.
5. Concurrent draft saves produce one application; simultaneous submissions produce one success/notification; overlapping interviewer bookings allow one success.
6. Concurrent mutual super-admin demotions leave exactly one super admin.
7. A real Auth ban denies private queries/privileged RPCs with the original, still-unexpired access token.
8. Signup → SY profile → draft/reload → three domain preferences → required text/choice/numeric-zero answers → submit → read-only application → task → private document → admin search/reviewer assign/remove/document visibility/notes → shortlist → interview → evaluation → selected result/notifications → logout/login persistence.
9. Direct API requests cannot escalate roles, change review status, read internal notes/evaluations/raw interview notes, or accept mismatched/revoked invitations.

### SQL security coverage

Own-record isolation; forged signup metadata; escalation; immutable profile/email ownership; direct application writes; duplicate/late/invalid submission; notification content/read state; assigned/unassigned/revoked recruiters; invalid transitions; analytics scope; interview overlap/privacy; evaluation scores/privacy; private-file ownership; hashed/matching/verified/unexpired/unrevoked/one-use invitations; demoted inviter; audit forgery/privacy; published CMS isolation; anonymous Storage/RPC denial; invalid choice configuration; numeric zero/optional blanks; changed domain/limit checks; protected historical campaigns/questions; idempotent member messages; task upsert/URL/ownership/deadline checks; and banned JWTs.

## Hosted work still required

At the initial local-only handoff, CLI authentication and private role verification were unavailable. This is superseded by the authenticated production release update above; do not treat the historical blocker as current.

Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md):

1. Run `supabase/manual/verify-super-admin.sql` in the intended project's trusted SQL editor. Use the guarded bootstrap only if the active, verified account lacks the role.
2. Authenticate/link the CLI, back up, inspect/reconcile existing schema and migration history, review a dry run and apply the intended pending migrations. Never reset production or blindly replay baseline table creation.
3. Configure Auth Site URL/redirects, production email confirmation and SMTP; verify real signup/recovery emails. Invitations provide a shareable link, not an automatically sent email.
4. Set public frontend environment values, build/deploy with SPA fallback, and execute the documented hosted smoke test using controlled accounts and a test campaign.

The publicly visible existing campaign closed on 2026-09-30 despite `status='open'`. An administrator must intentionally configure valid current dates/status before production applications can be accepted; the implementation does not silently reopen it.

## Remaining limits

- External member-email integration is not implemented. In-app notifications work; production Auth mail needs SMTP setup.
- Vite warns about bundle size: approximately 1.10 MB main JavaScript and 549 kB Three.js before gzip. Route/vendor splitting is a follow-up, not a passing production load-test claim.
- Browser coverage is Chromium, not exhaustive device/accessibility/cross-browser/load certification. Hosted production remains untested.
- Private documents are not malware-scanned. Issued signed links remain usable until their short 60-second expiry; club images are intentionally public.
- Storage cleanup and database writes are not one transaction. Warnings are surfaced, but interrupted requests may leave orphan uploads for operator inspection.
- Target-batch text is not verified enrollment; institution email suffixes are not enforced. Stricter admission rules need an explicit policy decision.
- No custom MFA enrollment UI, external privileged export service or additional backend framework was invented.
- The initial handoff made no commits, pushes, PRs or production deployment. See the release update for subsequent rollout. Unrelated `.DS_Store` changes and local runtime metadata are excluded from release commits.

## Handoff

Use `pnpm dev:local` for the tested local backend. Use `.env.local`/the hosted fallback only after hosted migrations are deployed. [README.md](../README.md) contains commands; [backend-feature-inventory.md](backend-feature-inventory.md) maps screens to entities, permissions, states and verification. No default/shared admin password exists.
