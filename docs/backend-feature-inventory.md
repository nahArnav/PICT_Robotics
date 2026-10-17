# Backend feature inventory and implementation plan

Updated 2026-10-17 after implementation. “Previous” describes the inspected frontend, not production behavior. Authenticated release preflight confirmed hosted migration history and the designated super-admin account; all eight new migrations are now applied while existing records remain intact. Frontend release status is recorded separately.

## Architecture

React 19, React Router, Vite and Tailwind remain. One typed Supabase client uses environment overrides or the existing hosted public configuration. Shared auth resolution verifies Auth identity and database roles; protected layouts wait for authorization. Browser guards are supplementary, not the security boundary.

Services in `src/lib/services/` handle typed RLS-protected queries. PostgreSQL security-definer RPCs enforce transactional draft/submission, review transitions, scheduling, invitations, roles and bulk notifications, with explicit execution grants/search paths. RLS also protects direct API requests. Storage manages images/private documents. No additional backend framework or database was introduced.

`src/lib/data.ts` remains for original editorial content and compatibility. Dynamic applicant/staff/CMS screens do not fall back to fake users, fake analytics or demo success. Exact existing public content was preserved as CMS records. Old Figma health/KV functions remain, but these workflows no longer depend on their missing endpoints.

## Screens and actions

| Feature | Previous behavior | Backend operation | Entities | Authorization | Success | Error | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Public navigation | Static links/open badge | Auth-aware portal link, projects/mobile navigation | Auth, user_roles | Public; role-aware destination | Correct portal | Protected redirect/denial | Browser mobile/route checks |
| Home | Static highlights/events/campaign | Published CMS reads and date-valid campaigns | homepage_metrics, achievements, club_events, announcements, recruitment_cycles | Public published content | Real DB content | Loading/retry/empty; no fabricated counts | CMS public browser check |
| Achievements | Static cards/filter | Published year/category/search and spotlight | achievements | Public reads; admin CRUD | Matching published records | Empty/load errors | SQL published/draft isolation; browser create/read |
| Projects | Static list/details | Paginated search/filter, slug detail, actual links/tags | projects | Public reads; admin CRUD | Persisted project | Unpublished/not-found; retry | Browser CRUD/publish/unpublish/network retry |
| Events | Partly connected pages | Upcoming/past/detail, state/registration controls | club_events | Published/completed public; admin CRUD | Correct event visibility | Validation/RLS/load errors | Browser create/public read; SQL policies |
| Team/gallery | Static council/photos | Ordered published CMS entries | club_team_entries, gallery_items | Public read; admin CRUD | DB entries in original layout | Empty/error states | Migration chain; gallery image lifecycle test |
| Recruitment landing | Fixed September dates | Current campaigns, actual rounds/deadlines | recruitment_cycles, recruitment_rounds | Public non-draft/active records | Correct selected campaign link | No-open-campaign state | Browser selected cycle; SQL deadline checks |
| Signup | Auth call, incomplete workflow | Signup → trusted profile/default applicant role → verify/dashboard | auth.users, profiles, user_roles | Public Auth; role metadata ignored | Account/profile persist | Duplicate/invalid/verification/network error | Browser signup; SQL forged metadata test |
| Login/session/logout | Fragmented auth/demo helper | Shared restoration, current roles, safe redirects; staff inactivity logout | Auth, user_roles | Active real identity | Correct portal; refresh/signout/login | Loading-safe guards, invalid credentials | Browser full journey; SQL/API role checks |
| Password recovery | Missing | Request → email link → new password → login | Supabase Auth | Recovery session | New password works | Invalid/expired link or safe request message | Browser real local inbox/reset/login |
| Profile | Incomplete/demo fields | Own persisted contact/year/links; identity/email protected | profiles | Own permitted fields | Saved details reload | Ownership/email/RLS/URL errors | Browser form persistence; SQL identity tests |
| Private documents | Missing | Upload/list/signed open/delete; admin drawer access | private-applicant-files | Owner read/write/delete; admin read | Persisted private file | MIME/size/ownership/storage errors | Browser upload/refresh/delete; SQL isolation/ban |
| Application wizard | Hard-coded fields, dead custom endpoint | Existing five steps, dynamic domains/questions, selected campaign | profiles, applications, domains, recruitment_questions | Own applicant/open campaign | Real form/draft data | Required/type/URL/preference validation | Browser text/choice/number questions and draft |
| Draft actions | Nonfunctional persistence | Atomic application/preferences/answer upsert | applications, preferences, answers | Own draft | Refresh resumes draft | Submitted edit lock; invalid preferences | Browser save/refresh; concurrent draft API |
| Submission | Missing endpoint/fake success | Locked required fields/questions/preferences/deadline validation, notification/audit | applications and children, notifications, audit_logs | Own applicant draft | One submission/notification | Missing/late/duplicate/invalid answer | SQL negative cases; browser; simultaneous submits |
| Applicant portal | Fake progress/status | Shared own dataset, campaign selection and read-only application | profiles, applications, cycles | Owner only | Actual status/result across sessions | Empty/error/retry; role redirect | Browser journey and refresh/logout/login |
| Tasks | Static task/form | Active task read and eligible-owner upsert with server deadline | recruitment_tasks, task_submissions | Own eligible application; admin config | Submission persists/updates | Deadline, inactive, cross-user, URL denial | Browser task; SQL upsert/ownership/deadline |
| Interviews/results | Mock schedule/result | Safe schedule-only RPC and actual application result | interviews, applications | Own application; internal notes hidden | Real schedule/result | No interview/pending result | Browser journey; SQL notes/score privacy |
| Notifications | Demo messages | Own messages/announcements, one/all read timestamp | notifications, announcements | Owner read-state; admin announcements | Read state persists | Cross-user/content edits denied | Browser notification; SQL immutability/idempotency |
| Admin access/layout | Demo helper and role race | Shared login, database-role dashboard routing, scoped desktop/mobile nav/search/campaign selection | Auth, roles | Recruiter/admin/super_admin | Authorized portal only | Applicant/revoked/banned denial | Browser all-role/revocation routing, invite/settings denial; SQL/API checks |
| Overview/analytics | Fake counts | Server counts/year/branch/domain/status by authorized campaign | applications, profiles, preferences | Assigned recruiter scope or admin | Real empty/non-empty metrics | Load/retry; zero-safe charts | SQL filters/aggregation; browser overview |
| Applicant table | Mock list/browser filters | Server search/status/year/branch/domain/campaign filters and pages | applications, profiles, preferences | Assigned recruiter or admin | Authorized rows/count | RLS/load errors; exact bulk failures | SQL filters; browser lookup/review |
| Applicant drawer | Demo details/notes | Actual answers/tasks/scores/interviews/notes, reviewer assign/remove, admin files | Application children, notes, assignments, storage | Scoped staff; admin assignment/files | Saved review details | Permission/validation/retry | Browser notes/review; SQL assignment/privacy |
| Status buttons | Client/demo updates | Explicit backend transitions, notification/audit | applications, notifications, audit_logs | Assigned reviewer/admin | Valid status persists | Invalid jumps/applicant tampering denied | Browser review→shortlist→interview→selected; SQL |
| Recruitment configuration | Stub pipeline | CRUD cycles/rounds/questions/domains with limits/date/options/active validation | cycles, rounds, questions, domains | Admin/super_admin | Configuration drives public/form pages | Bad options/date/URL; historical deletion blocked | SQL config/history/runtime guards |
| Staff interviews | Static calendar/panels | Schedule/calendar/panels, create/reschedule/cancel/complete, automatic assignment | interviews, assignments, applications | Scoped staff/admin | Schedule saved + notification | Past, ineligible, wrong round, overlap rejection | Browser scheduling; SQL and concurrent bookings |
| Evaluations | Unsaved rubric | Six-criterion 50-point score, feedback/recommendation, own update | evaluations | Assigned evaluator/admin | Server-computed score persists | Range/ownership/duplicate denial | Browser evaluation; SQL score/revocation |
| CMS | Static/stub admin screens | Typed CRUD, publish/feature/order for all requested content | achievements, projects, events, announcements, team, gallery, metrics | Admin/super_admin | Real public change after save | RLS/FK/validation; no fake success | Browser CMS actions; SQL public/private policies |
| Club images | No lifecycle | Deferred validated UUID upload; unreferenced replacement/deletion cleanup | club-media, image references | Admin upload/delete | Saved image; shared refs retained | Upload/save/cleanup warning | Browser upload/shared/last-reference deletion |
| Member Mail | Dead custom endpoint | Paginated registered accounts, idempotent notifications, up to 200/request | profiles, notifications, audit_logs | Admin/super_admin | Exact in-app delivery count | Invalid/denied; no fake external email | SQL delivery/idempotency |
| Staff invitations | Public signup/plaintext token | Hashed create/list/revoke, token-specific preview, new/existing confirmed-email acceptance | admin_invites, roles, Auth, audit | Admin→recruiter; super→all staff | One-use intended role/portal | Expired/revoked/reused/mismatch/unverified/demoted inviter denied | Browser both acceptance paths; SQL negative cases |
| Settings/roles | Incomplete | Paginated user lookup and serialized role RPC, no self-demotion | user_roles | Super_admin | Trusted change, immediate backend enforcement | Escalation/concurrent final-super removal denied | SQL privilege; two-super concurrency API |
| Audit history | Broken/incomplete trigger | Trusted sensitive-operation history, safe metadata, paginated read | audit_logs | Super_admin read; no browser write | Role/review/CMS/invite activity visible | Forgery/modification/ordinary-staff read denied | SQL audit security; full migration chain |
| Disabled identities | No reliable stale-JWT guard | Auth active-state role check and restrictive app/storage RLS, guarded RPCs | auth.users, app tables, storage | Active identity | Revocation before JWT expiry | Old token cannot retain private/staff access | SQL and real Auth ban/direct-token API |

## Delivery phases

1. Repository/Supabase inspection and initial inventory: completed; no live schema writes.
2. Incremental schema, bootstrap, RPCs, RLS and Storage: implemented; complete chain tested on isolated PostgreSQL and real local Supabase.
3. Shared auth/recovery/invitation/route protection: implemented and browser-tested locally.
4. Applicant profile/draft/submit/tasks/status/interviews/results/notifications: implemented; real full journey plus adversarial SQL/API tests.
5. Administrative review/search/assignments/configuration/interviews/evaluations/analytics: implemented; authorization and concurrency checks.
6. Public CMS, preservation of existing content/images and in-app member messages: implemented and tested.
7. Final integration/type/unit/database/browser/build verification and handoff: exact executed results in `IMPLEMENTATION_REPORT.md`.
8. Hosted rollout: Supabase preflight/backup/migrations and super-admin verification completed. Render frontend and hosted Auth/email checks are tracked in the release report. Local completion alone is not a live frontend deployment.

## Decisions and explicit limits

- Reuse existing column names (`year`, `target_batch`, `application_open`, etc.), rather than add a conflicting parallel schema.
- Database roles are authoritative. Supabase owns password/session handling; no demo passwords or browser role storage remain.
- Staff explicitly select results; completing an interview does not automatically select someone. Waitlisted applicants may be selected later.
- `target_batch` is editorial eligibility text. FY/SY and required profile data are validated, but enrollment is not independently verified and a `pict.edu` email suffix is not enforced. Stricter admission rules need a product decision.
- First super-admin bootstrap is a trusted operator action; subsequent provisioning is invite/role-controlled. Optional private documents do not invent a required résumé workflow.
- Member Mail is in-app, not external email. Production Auth SMTP is enabled and the redirect allow-list is corrected; real inbox delivery still needs verification.
- Realtime is not required. Loads occur on navigation/refresh and actions refresh their data. Role UI rechecks on focus/every 60 seconds; backend revocation/ban checks are immediate.
- Original editorial About/domain content, animations, visual assets and branding remain. CMS handles operational content, team/gallery/highlights.
- Production history/private data, MFA enrollment UI, malware scanning, traffic/load testing and deployment-domain/email behavior are not certified by local tests.
