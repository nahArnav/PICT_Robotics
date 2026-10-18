# Implementation and verification report

Updated: 2026-10-18. Deployment repository: `nahArnav/PICT_Robotics`.

## Admin-authored application forms

The entire recruitment application is now configurable under Admin → Form Builder: sections, ordering, labels, instructions, required flags, 12 input types, linked profile properties, custom questions/options, interactive preview, private builder drafts and explicit publication. Ordinary admins and super admins have access; applicants do not. New campaigns have no form until an admin builds/publishes one. The optional PICT starter uses CE/IT/ENTC/AIDS/ECE, a typed class/division and FY/SY choices restricted by the drive's exact target batch.

First explicit applicant save pins the published schema/version. Later publications affect new applications only. The migration copies existing legacy drafts into pinned forms without deleting their original answer/preference/profile records; inactive saved answers and numeric zero are covered by an upgrade fixture. Historical submissions remain compatible. Submitted responses and their private attachments are protected from owner edits/deletion. Admin/applicant reviews render the actual saved schema. No page visit or preview automatically creates an application.

Executed verification: TypeScript, **30 unit tests**, **144 database workflow/security assertions across 19 migrations**, the **22-case local browser suite (3.1 minutes)**, formatting checks and the environment-validated production build passed. The first full run had one local Auth gateway timeout; the trace returned HTTP 504 for sign-in. The complete rerun passed without changing authentication code. Desktop and 390-pixel mobile screenshots were inspected. Browser cases cover admin build/publish, custom questions, zero, file upload/retention, unsaved-edit warnings, interrupted-save recovery, draft/reload/submit, version retention, CAS conflict, unpublish and applicant route denial, alongside all retained workflows.

Private schema/data backups were saved with owner-only permissions in the owner-approved ignored local directory before rollout. Both reviewed migrations are applied to hosted Supabase; all 19 versions match. One-way aggregate fingerprints confirmed unchanged original application columns, all 13 profiles, saved answers and domain preferences. The existing draft additionally has its pinned form/answer snapshot; application/notification counts are unchanged. The hosted read-only RLS/staff/form-builder smoke script passed. No reset, seed, role/password change or secret synchronization occurred.

Source commits `ae9cf2b` (backend/security) and `a3acca3` (builder/applicant UI/tests/docs) were pushed to the existing deployment repository. Render serves `/assets/index-BUAQWM8C.js`, verified byte-for-byte against the tested production build. `/`, `/signin`, `/admin/form-builder`, `/apply` and `/recruitment` return 200 without redirects and use that bundle. A real anonymous Chromium visit to the live builder route reached the shared sign-in, not staff controls. Authenticated builder mutations were tested on local Supabase, not performed on real production applicants merely for deployment verification. See [APPLICATION_FORM_BUILDER.md](APPLICATION_FORM_BUILDER.md) for operation and limits.

## Robot arm animation correction

The homepage arm now uses elbow-up inverse kinematics, a level wrist, side-face gripping and a clearance-constrained cylindrical tool path. Pickup and delivery remain interactive; each delivery locks its destination so cursor/camera movement cannot make the arm chase a moving target. Joint/body clearance, floor clearance, safe startup/reduced-motion poses, frame-rate-independent easing and portrait camera framing are covered by new tests. The camera stays near a readable side-on view instead of hiding the links behind the body.

TypeScript, **19 unit tests**, the **20-case local end-to-end suite** and the environment-validated production build passed. Browser coverage includes repeated pick/place cycles with pointer movement during delivery and a 390×844 reduced-motion scene. No database migration, production record change, role/auth change or unrelated frontend enhancement is included. Further website improvements remain suggestions pending owner approval.

## Read-notification deletion update

Applicants can delete their own read notifications in Announcements & notifications; admins/super admins can do the same from the notification bell. Unread items expose Mark read instead. Every deletion asks for confirmation, failures remain visible with retry, and successful deletion persists across refresh/logout/login. Public announcements and underlying application/interview data are not affected.

Migration 202610180001 adds one authenticated DELETE policy requiring ownership, read state and an active account. It contains no data-deletion statement. A private pre-release backup was saved under ignored `.backups/`; the reviewed migration is applied to hosted/local Supabase. Even admins and super admins cannot delete another account's notifications. Anonymous/banned attempts are denied, and independent member-message receipts prevent retries from resurrecting deleted notifications.

Hosted postflight confirmed 17 migration versions, the exact owner/read/active-account policy and unchanged counts of 3 notifications, 13 profiles and 1 application. The read-only hosted RLS/staff-RPC smoke script passed. No real production notification was deleted during verification.

Executed checks: **13 unit tests, 18 end-to-end tests (53.3 seconds), 96 database assertions across 17 migrations**, TypeScript and the environment-validated production build passed. New browser cases cover applicant/admin UI deletion, cancel, network-failure/retry, unread controls, reload/login persistence and cross-account API isolation.

An additional 390×844 viewport assertion exposed the admin bell popup opening partly off-screen when the mobile header wrapped. The popup now anchors to the full header on small screens while retaining its desktop anchor. Both targeted notification cases and the final full 18-case suite passed again, including explicit in-viewport bounds and mobile deletion.

Read-only Auth inspection on 2026-10-18 reconfirmed Supabase Auth uses enabled custom Gmail SMTP (`smtp.gmail.com:465`) with email confirmation required; secrets were neither displayed nor changed. This sends Auth verification/recovery mail only. Member/interview updates remain in-app, not external emails. [NOTIFICATIONS_AND_INTERVIEWS.md](NOTIFICATIONS_AND_INTERVIEWS.md) documents the exact controls and scheduling steps.

## Role/activity simplification (2026-10-17)

The owner requested removal of the recruiter role and audit/activity feature. Only applicant, admin and super_admin remain supported. Admins perform all applicant reviews, interviews and evaluations without needing an assignment; optional reviewer assignments allocate work, not access. Only super admins can invite staff or manage account roles. The old PostgreSQL enum label is retained solely for history compatibility and blocked by constraints/RPCs.

Migration 202610170009 is applied to local and hosted Supabase. Production preflight found no recruiter accounts and one unused recruiter invitation, which is revoked rather than upgraded. A fresh private schema/data backup was saved in ignored `.backups/` before applying the single pending migration. Historical app activity is retained privately; new recording stops, activity triggers are removed, API permissions are revoked, and the UI no longer queries/displays it. Independent opaque notification request receipts preserve retry safety, including old requests.

Hosted postflight matched all 16 migration versions and preserved 9 profiles, 1 application, existing role counts and 48 historical activity rows. There are zero activity-producing triggers, zero pending recruiter invitations, and authenticated clients have no audit-table SELECT privilege. The hosted read-only RLS/staff-RPC smoke script passed after the change.

Current verification: TypeScript, 10 unit tests, **87 database assertions across 16 migrations**, 16 browser tests in 48.9 seconds, and the production build passed. Browser coverage includes absence of the activity feed/role option, direct API denials, admin event access, super-admin-only provisioning and all retained workflows. The owner has confirmed live super-admin login works; real production email delivery still needs verification. Earlier rollout notes below describe the preceding releases where applicable.

## Production release update

The deployment repository is `nahArnav/PICT_Robotics`, confirmed against the local remote and Render's existing static service `srv-daramg7pn0mc738ojqbg`. Authenticated preflight verified the designated super admin, all seven earlier migrations, no missing/mismatched profiles and RLS on every public table. Private schema/data backups were saved in ignored `.backups/`; all eight completion migrations were then applied successfully. Existing profiles (8), applications (1), invitations (2) and roles were preserved. All 15 migration versions now match.

The current release build passed production environment validation, TypeScript, **10 unit tests**, and **16 local end-to-end tests** (48.9 seconds), including a regular admin creating/opening/closing recruitment, respecting a single-preference limit and preserving a draft after closure. The UI explains why Continue is disabled, offers profile/recruitment navigation, shows campaign date validity, and provides explicit open/close controls.

Release `289e527` was pushed to `main` and Render's public root served its matching `index-DvIMYj6B.js` bundle. A live browser check confirmed published Supabase projects render and client-side navigation reaches sign-in. Direct links initially returned **301 to `/index.html`**, causing the router's 404. The owner's screenshot confirmed Action was Redirect; they changed it to Rewrite. Eight direct-route checks now return **200 with no Location header**, and a real project deep link renders and survives browser refresh. Existing Render build/environment settings were not independently verified; `render.yaml` alone does not update an unmanaged service.

The shared-login change (`14429b7`, released through `de41c77`) was confirmed live by its exact `index-Dbx3EaUo.js` bundle. The final compatibility release `3246bff` is now verified live by `index-BKSbk5es.js`; it removes signup-only password-length validation from existing-account sign-in, and the full suite passed again with a valid six-character legacy admin credential. Everyone uses `/signin`, and `/admin/login` remains an alias. The live browser confirmed both the alias and anonymous `/admin/events` visits reach the shared login instead of exposing staff UI. Preassigned applicant/recruiter/admin/super-admin roles, refresh, existing-session redirects, wrong-dashboard visits, missing roles, forged metadata and revoked access are covered by six new local browser tests. The database remains the security boundary; no frontend email allow-list or role selection was added. [ACCOUNT_ROLES.md](ACCOUNT_ROLES.md) explains safe provisioning.

Production Auth inspection confirmed the correct HTTPS Site URL, required email confirmation and enabled custom Gmail SMTP. The redirect allow-list contained only the origin; a sparse production config added `/signin`, `/reset-password` and `/admin/signup**`. A post-update comparison found zero declared differences and confirmed all unrelated settings were unchanged. SMTP credentials were preserved. The owner confirmed live super-admin login and correct dashboard routing; real production inbox delivery remains unverified.

## Outcome

The existing frontend is connected to Supabase across public content, applicant and admin workflows. The backend and shared-login frontend are deployed, and Render routing is corrected. This is **not a claim that every production workflow has passed**: controlled production mutation/email smoke checks remain outstanding. No hosted password, existing account role or application decision was changed.

React/Vite/Tailwind, branding, animation assets and existing public/portal routes remain. Operational screens use database data with loading/error/empty states. Demo credentials, fake operational data and missing custom-endpoint success paths were replaced. Existing public content was preserved as CMS records, not replaced with newly invented club claims.

## Delivered

- Eight incremental completion migrations, typed services and trusted transactional RPCs; existing migration history and the pre-existing audit fix are preserved.
- One shared login, session restoration, database-role dashboard routing, logout, password recovery, and trusted applicant-only profile/default-role bootstrap.
- Invitation-only staff acceptance for new/existing confirmed matching accounts, hashed one-use secrets, expiry/revocation and inviter-authority rechecks.
- Current database role enforcement, admin review capabilities, super-admin-only staff provisioning and banned-account restrictions for existing JWTs. Concurrent role changes retain a super admin. Recruiter and app audit/activity features are retired.
- Applicant profile/private documents, admin-authored version-pinned form drafts, configurable question types and one-to-three domain preferences, FY/SY handling, atomic submission, duplicate prevention and server deadlines; historical forms remain compatible.
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
| `pnpm test` | 30 unit tests passed, including form schemas/answers and retained arm motion/clearance/framing |
| `pnpm test:database` | Passed: all 19 migrations and 144 workflow/security/upgrade assertions in isolated PostgreSQL 16 |
| Local Supabase migrations | Applied successfully to the dedicated real Supabase PostgreSQL 17 stack |
| `pnpm test:e2e` | Latest full run: 22 tests passed using local Auth/PostgREST/Storage and Chromium, including the form builder, arm cycle/mobile pose, notification deletion and retained applicant/admin workflows |
| `pnpm build:production` | Public environment guard, type/unit checks and build passed; large-chunk warning remains |
| `pnpm peers check` | No peer dependency issues |
| `git diff --check` | Passed |
| Optional manual staff provisioning | Confirmed local test account gains only the explicitly requested staff role; unconfirmed account is rejected |
| Live Render routes | Eight routes return 200 without redirects; shared login alias, anonymous staff protection and published project deep-link refresh verified in a real browser |

No lint script was configured; no lint pass is claimed. The old Oxfmt 0.2 corrupted TypeScript type-member separators during formatting. Source was repaired, Oxfmt upgraded to 0.73, and the formatted result passed checks. React/React DOM remain major 19 and now satisfy the existing React Router peer requirement.

The expanded SQL suite exposed a test-harness startup race: it connected to PostgreSQL's temporary initialization server. The harness now waits for the final TCP server and the full SQL suite passed. A mobile test exposed CMS intrinsic-grid-width overflow; zero-minimum grid tracks fixed it, and the mobile/browser suite passed afterward.

### Browser/API coverage

1. CMS create/publish/update/unpublish/delete reflected publicly; achievement/event/announcement publication; image upload, shared-image retention and last-reference cleanup.
2. New and existing staff accept real admin invitation links; ordinary admins cannot open super-admin settings.
3. Real local recovery email → password change → login; private document upload/refresh/delete.
4. Anonymous route protection, 390×844 mobile navigation/layout, simulated backend failure and working Retry.
5. Concurrent draft saves produce one application; simultaneous submissions produce one success/notification; overlapping interviewer bookings allow one success.
6. Concurrent mutual super-admin demotions leave exactly one super admin.
7. A real Auth ban denies private queries/privileged RPCs with the original, still-unexpired access token.
8. Signup → SY profile → draft/reload → three domain preferences → required text/choice/numeric-zero answers → submit → read-only application → task → private document → admin search/reviewer assign/remove/document visibility/notes → shortlist → interview → evaluation → selected result/notifications → logout/login persistence.
9. Direct API requests cannot escalate roles, change review status, read internal notes/evaluations/raw interview notes, or accept mismatched/revoked invitations.
10. A regular admin creates, opens and closes recruitment; the public campaign, single-preference applicant wizard and saved drafts follow those changes.
11. Shared-login cases cover applicant/admin/super-admin roles, ignored forged metadata, missing-role denial and same-session staff revocation. Every role uses the same interface, restores correctly and redirects out of the wrong dashboard. The removed activity feed and retired role are absent, and direct API attempts are denied.

The first shared-login suite run exposed an obsolete test expectation that applicants visiting `/admin` see a separate admin login. The expected destination was updated to their own dashboard, matching the new requirement; the complete suite then passed. The local container runtime had stopped and was restored from retained volumes without resetting data.

### SQL security coverage

Own-record isolation; forged signup metadata; escalation; immutable profile/email ownership; direct application writes; duplicate/late/invalid submission; notification content/read state; assigned/unassigned/revoked recruiters; invalid transitions; analytics scope; interview overlap/privacy; evaluation scores/privacy; private-file ownership; hashed/matching/verified/unexpired/unrevoked/one-use invitations; demoted inviter; audit forgery/privacy; published CMS isolation; anonymous Storage/RPC denial; invalid choice configuration; numeric zero/optional blanks; changed domain/limit checks; protected historical campaigns/questions; idempotent member messages; task upsert/URL/ownership/deadline checks; and banned JWTs.

## Hosted work still required

Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md):

1. Super-admin verification, private backups, all 19 migration versions and the hosted read-only RLS/staff/form-builder smoke script are complete. Never reset production or blindly replay baseline table creation.
2. Site URL, redirect allow-list, email confirmation and configured SMTP are checked/corrected. Verify real signup/recovery delivery in a controlled inbox. Invitations provide a shareable link, not an automatically sent email.
3. Render's wildcard **Rewrite**, direct route refreshes and exact shared-login production bundle are verified.
4. The owner confirmed live super-admin login. Remaining controlled production mutation/email checks must not publish a new recruitment campaign or alter real application decisions merely to test deployment.

The publicly visible existing campaign closed on 2026-09-30 despite `status='open'`. An administrator must intentionally configure valid current dates/status before production applications can be accepted; the implementation does not silently reopen it.

## Remaining limits

- External member-email integration is not implemented. In-app notifications work; production Auth SMTP is configured but real delivery remains unverified.
- Vite warns about bundle size: approximately 1.14 MB main JavaScript and 549 kB Three.js before gzip. Route/vendor splitting is a follow-up, not a passing production load-test claim.
- Browser coverage is Chromium, not exhaustive device/accessibility/cross-browser/load certification. Hosted read-only backend/public-page checks passed, but live authenticated production workflows remain unverified.
- Private documents are not malware-scanned. Issued signed links remain usable until their short 60-second expiry; club images are intentionally public.
- Storage cleanup and database writes are not one transaction. Warnings are surfaced, but interrupted requests may leave orphan uploads for operator inspection.
- Target-batch text is not verified enrollment; institution email suffixes are not enforced. Stricter admission rules need an explicit policy decision.
- No custom MFA enrollment UI, external privileged export service or additional backend framework was invented.
- Source was committed/pushed to the existing deployment repository; no pull request or duplicate service was created. Unrelated `.DS_Store` changes and local runtime metadata are excluded from release commits.

## Handoff

Use `pnpm dev:local` for the tested local backend. Use `.env.local`/the hosted fallback only after hosted migrations are deployed. [README.md](../README.md) contains commands; [backend-feature-inventory.md](backend-feature-inventory.md) maps screens to entities, permissions, states and verification. No default/shared admin password exists.
