# Backend feature inventory and implementation plan

This inventory is based on the repository at commit `main` as inspected on 2026-09-25. It records the current UI as it exists; it does not treat static demo data as production data.

## Current architecture

- React 19 + TypeScript + Vite app using React Router.
- Browser Supabase client in `src/lib/supabase.ts`; it uses the configured public project reference and anon key with persisted sessions.
- Three existing SQL migrations define a recruitment schema, events, and invitations. The Supabase REST check returned `PGRST205` for `recruitment_cycles`, so those migrations are **not applied** to the configured project.
- `supabase/functions/server` is a Figma Make Hono endpoint. It exposes health only, while the application form and member-mail screens call unimplemented paths under it.
- `src/lib/data.ts` supplies static content and mock applicant/dashboard data. It remains in place while each screen is migrated to real data.

## Screen and workflow inventory

| Area | Current implementation | Backend operation and authorization | Verification |
| --- | --- | --- | --- |
| Applicant sign-up/sign-in | Supabase Auth calls; generic Supabase errors | Sign up must create profile and only the `applicant` role. Any signed-in applicant may sign in/out and reset a password. | Auth service tests; route-guard tests. |
| Applicant dashboard | Session-only guard; static progress, announcements, results | Read only the caller's profile, application, applicant-visible interviews and notifications. | RLS isolation tests. |
| Application form | Hard-coded fields/domains; calls an unimplemented custom endpoint | Authenticated applicant saves a draft and submits only their application in an open cycle. | Draft/submit atomicity, deadline, duplicate tests. |
| Admin sign-in/layout | Supabase sign-in plus role lookup; no loading-safe auth listener | Recruiter/admin/super-admin roles may enter; applicants are rejected before admin data renders. | Applicant denial and role revocation tests. |
| Admin invitations | Direct insert returns a plaintext token | Super-admin or permitted admin creates/revokes an invitation through a trusted database function; recipient accepts only their unexpired, matching-email invite. | Create, mismatch, expiry, revoke, reuse tests. |
| Applicant list/overview | Static mock data and browser-side filters | Authorised staff gets paginated, server-filtered application data limited to assignments for recruiters. | RLS and query filter tests. |
| Events | Public and admin screens use `club_events` directly | Public reads published events; admins manage events. | Published/draft RLS and CRUD tests. |
| Achievements/projects/content | Static mock data; CMS is a stub | Public reads published records; admins manage persistent content. | Public visibility and CRUD tests. |
| Announcements/notifications | Static data; member mail calls an unimplemented custom endpoint | Admins publish announcements; applicants read and mark only their own notifications. Email remains optional server-side integration. | Ownership and unread-state tests. |
| Interviews/evaluations | Static schedule and form | Assigned recruiter or admin schedules/evaluates; applicants see only their own non-sensitive interview details. | Assignment, double-booking, and privacy tests. |

## Delivery phases

1. **Configuration and database security (in progress):** add a compatible hardening migration, replace plaintext invitation handling, establish trusted RPC workflows, and lock down RLS.
2. **Authentication and route protection:** centralize session/role resolution; replace client-only admin access and demo credentials; add applicant profile bootstrap and password-reset UX.
3. **Applicant workflow:** replace the custom mock endpoint with typed Supabase services for profile completion, cycles, draft saving, submission, and status tracking.
4. **Administrative workflow:** add server-filtered applicant data, controlled status transitions, assignments, interviews, evaluations, dashboard metrics, invitations, and audit views.
5. **Public CMS and notifications:** migrate events, achievements, projects, announcements, storage metadata and applicant notifications to persistent services.
6. **Verification and deployment documentation:** add tests that exercise direct database policy boundaries, run the production build, and document migration/deployment and one-time bootstrap steps.

## Decisions and constraints

- Existing frontend routes, components, styles, and mock data are preserved until their backend equivalents are ready. Mock data is not a source of truth for new records.
- No live schema was modified during inspection. The current public project can be reached, but it has no `recruitment_cycles` table in its REST schema cache; applying migrations needs authenticated Supabase CLI/Dashboard access.
- Creating the first `super_admin` cannot safely be automated from a browser. The migration documentation will require a single, audited SQL bootstrap using a known authenticated user ID.
- The repository's four Git LFS-tracked image files arrived as non-pointer content, which Git reports as modified. They are unrelated to backend work and will not be changed.
