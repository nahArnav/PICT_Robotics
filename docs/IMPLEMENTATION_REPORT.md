# Implementation and verification report

Date: 2026-10-17. Deployment repository: `nahArnav/PICT_Robotics`.

## Production release update

The deployment repository is `nahArnav/PICT_Robotics`, confirmed against the local remote and Render's existing static service `srv-daramg7pn0mc738ojqbg`. Authenticated preflight verified the designated super admin, all seven earlier migrations, no missing/mismatched profiles and RLS on every public table. Private schema/data backups were saved in ignored `.backups/`; all eight completion migrations were then applied successfully. Existing profiles (8), applications (1), invitations (2) and roles were preserved. All 15 migration versions now match.

The current release build passed production environment validation, TypeScript, **10 unit tests**, and **16 local end-to-end tests** (1.5 minutes), including a regular admin creating/opening/closing recruitment, respecting a single-preference limit and preserving a draft after closure. The UI explains why Continue is disabled, offers profile/recruitment navigation, shows campaign date validity, and provides explicit open/close controls.

Release `289e527` was pushed to `main` and Render's public root served its matching `index-DvIMYj6B.js` bundle. A live browser check confirmed published Supabase projects render and client-side navigation reaches sign-in. Direct links initially returned **301 to `/index.html`**, causing the router's 404. The owner's screenshot confirmed Action was Redirect; they changed it to Rewrite. Eight direct-route checks now return **200 with no Location header**, and a real project deep link renders and survives browser refresh. Existing Render build/environment settings were not independently verified; `render.yaml` alone does not update an unmanaged service.

The shared-login change (`14429b7`, released through `de41c77`) was confirmed live by its exact `index-Dbx3EaUo.js` bundle. The final compatibility release `3246bff` is now verified live by `index-BKSbk5es.js`; it removes signup-only password-length validation from existing-account sign-in, and the full suite passed again with a valid six-character legacy admin credential. Everyone uses `/signin`, and `/admin/login` remains an alias. The live browser confirmed both the alias and anonymous `/admin/events` visits reach the shared login instead of exposing staff UI. Preassigned applicant/recruiter/admin/super-admin roles, refresh, existing-session redirects, wrong-dashboard visits, missing roles, forged metadata and revoked access are covered by six new local browser tests. The database remains the security boundary; no frontend email allow-list or role selection was added. [ACCOUNT_ROLES.md](ACCOUNT_ROLES.md) explains safe provisioning.

Production Auth inspection confirmed the correct HTTPS Site URL, required email confirmation and enabled custom Gmail SMTP. The redirect allow-list contained only the origin; a sparse production config added `/signin`, `/reset-password` and `/admin/signup**`. A post-update comparison found zero declared differences and confirmed all unrelated settings were unchanged. SMTP credentials were preserved; real production inbox delivery and a live authenticated admin session remain unverified.

## Outcome

The existing frontend is connected to Supabase across public content, applicant and admin workflows. The backend and shared-login frontend are deployed, and Render routing is corrected. This is **not a claim that every production workflow has passed**: controlled production login/email smoke checks remain outstanding. No hosted password, existing account role or application decision was changed.

React/Vite/Tailwind, branding, animation assets and existing public/portal routes remain. Operational screens use database data with loading/error/empty states. Demo credentials, fake operational data and missing custom-endpoint success paths were replaced. Existing public content was preserved as CMS records, not replaced with newly invented club claims.

## Delivered

- Eight incremental completion migrations, typed services and trusted transactional RPCs; existing migration history and the pre-existing audit fix are preserved.
- One shared login, session restoration, database-role dashboard routing, logout, password recovery, and trusted applicant-only profile/default-role bootstrap.
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
| `pnpm test` | 10 unit tests passed |
| `pnpm test:database` | All 15 migrations applied to a disposable network-isolated PostgreSQL 16 container; 78 workflow/security assertions passed |
| Local Supabase migrations | Applied successfully to the dedicated real Supabase PostgreSQL 17 stack |
| `pnpm test:e2e` | Final full run: 16 tests passed in 1.5 minutes using local Auth/PostgREST/Storage and Chromium, including a valid legacy admin credential |
| `pnpm build:production` | Public environment guard, type/unit checks and build passed; large-chunk warning remains |
| `pnpm peers check` | No peer dependency issues |
| `git diff --check` | Passed |
| Optional manual staff provisioning | Confirmed local test account gains only the explicitly requested staff role; unconfirmed account is rejected |
| Live Render routes | Eight routes return 200 without redirects; shared login alias, anonymous staff protection and published project deep-link refresh verified in a real browser |

No lint script was configured; no lint pass is claimed. The old Oxfmt 0.2 corrupted TypeScript type-member separators during formatting. Source was repaired, Oxfmt upgraded to 0.73, and the formatted result passed checks. React/React DOM remain major 19 and now satisfy the existing React Router peer requirement.

The expanded SQL suite exposed a test-harness startup race: it connected to PostgreSQL's temporary initialization server. The harness now waits for the final TCP server and the full SQL suite passed. A mobile test exposed CMS intrinsic-grid-width overflow; zero-minimum grid tracks fixed it, and the mobile/browser suite passed afterward.

### Browser/API coverage

1. CMS create/publish/update/unpublish/delete reflected publicly; achievement/event/announcement publication; image upload, shared-image retention and last-reference cleanup.
2. New and existing staff accept real invitation links; recruiters cannot open settings.
3. Real local recovery email → password change → login; private document upload/refresh/delete.
4. Anonymous route protection, 390×844 mobile navigation/layout, simulated backend failure and working Retry.
5. Concurrent draft saves produce one application; simultaneous submissions produce one success/notification; overlapping interviewer bookings allow one success.
6. Concurrent mutual super-admin demotions leave exactly one super admin.
7. A real Auth ban denies private queries/privileged RPCs with the original, still-unexpired access token.
8. Signup → SY profile → draft/reload → three domain preferences → required text/choice/numeric-zero answers → submit → read-only application → task → private document → admin search/reviewer assign/remove/document visibility/notes → shortlist → interview → evaluation → selected result/notifications → logout/login persistence.
9. Direct API requests cannot escalate roles, change review status, read internal notes/evaluations/raw interview notes, or accept mismatched/revoked invitations.
10. A regular admin creates, opens and closes recruitment; the public campaign, single-preference applicant wizard and saved drafts follow those changes.
11. Six shared-login cases cover each trusted role, ignored forged metadata, missing-role denial and same-session staff revocation. Every role uses the same interface, restores correctly, and redirects out of the wrong dashboard; recruiters still cannot manage events.

The first shared-login suite run exposed an obsolete test expectation that applicants visiting `/admin` see a separate admin login. The expected destination was updated to their own dashboard, matching the new requirement; the complete suite then passed. The local container runtime had stopped and was restored from retained volumes without resetting data.

### SQL security coverage

Own-record isolation; forged signup metadata; escalation; immutable profile/email ownership; direct application writes; duplicate/late/invalid submission; notification content/read state; assigned/unassigned/revoked recruiters; invalid transitions; analytics scope; interview overlap/privacy; evaluation scores/privacy; private-file ownership; hashed/matching/verified/unexpired/unrevoked/one-use invitations; demoted inviter; audit forgery/privacy; published CMS isolation; anonymous Storage/RPC denial; invalid choice configuration; numeric zero/optional blanks; changed domain/limit checks; protected historical campaigns/questions; idempotent member messages; task upsert/URL/ownership/deadline checks; and banned JWTs.

## Hosted work still required

Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md):

1. Super-admin verification, private backups, all 15 migration versions and the hosted read-only RLS/staff-RPC smoke script are complete. Never reset production or blindly replay baseline table creation.
2. Site URL, redirect allow-list, email confirmation and configured SMTP are checked/corrected. Verify real signup/recovery delivery in a controlled inbox. Invitations provide a shareable link, not an automatically sent email.
3. Render's wildcard **Rewrite**, direct route refreshes and exact shared-login production bundle are verified.
4. Execute the remaining controlled production login/admin workflow smoke. The owner has been asked to sign in using their existing account without sharing a password. Do not publish a new recruitment campaign or alter real application decisions merely to test deployment.

The publicly visible existing campaign closed on 2026-09-30 despite `status='open'`. An administrator must intentionally configure valid current dates/status before production applications can be accepted; the implementation does not silently reopen it.

## Remaining limits

- External member-email integration is not implemented. In-app notifications work; production Auth SMTP is configured but real delivery remains unverified.
- Vite warns about bundle size: approximately 1.10 MB main JavaScript and 549 kB Three.js before gzip. Route/vendor splitting is a follow-up, not a passing production load-test claim.
- Browser coverage is Chromium, not exhaustive device/accessibility/cross-browser/load certification. Hosted read-only backend/public-page checks passed, but live authenticated production workflows remain unverified.
- Private documents are not malware-scanned. Issued signed links remain usable until their short 60-second expiry; club images are intentionally public.
- Storage cleanup and database writes are not one transaction. Warnings are surfaced, but interrupted requests may leave orphan uploads for operator inspection.
- Target-batch text is not verified enrollment; institution email suffixes are not enforced. Stricter admission rules need an explicit policy decision.
- No custom MFA enrollment UI, external privileged export service or additional backend framework was invented.
- Source was committed/pushed to the existing deployment repository; no pull request or duplicate service was created. Unrelated `.DS_Store` changes and local runtime metadata are excluded from release commits.

## Handoff

Use `pnpm dev:local` for the tested local backend. Use `.env.local`/the hosted fallback only after hosted migrations are deployed. [README.md](../README.md) contains commands; [backend-feature-inventory.md](backend-feature-inventory.md) maps screens to entities, permissions, states and verification. No default/shared admin password exists.
