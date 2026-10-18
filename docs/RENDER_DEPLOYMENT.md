# Existing Render production service

Target: `srv-daramg7pn0mc738ojqbg` (`PICT_Robotics`, Static Site).
Public origin: https://pict-robotics.onrender.com
Repository/branch: https://github.com/nahArnav/PICT_Robotics/tree/main
Backend: Supabase `ycsqqktwzvqqblarqpfi`. Render hosts the browser build; Supabase hosts Auth, database/RLS, RPCs and Storage. Do not create a second database or new Render service.

2026-10-18 form-builder release: source through `a3acca3` is live, verified by a byte-identical `/assets/index-BUAQWM8C.js` bundle and working direct routes, including `/admin/form-builder`. Anonymous live-browser access redirects to the shared sign-in. Hosted history has all 19 migrations, and the read-only security/data-preservation checks passed. Authenticated mutation journeys were exercised locally, not against real production applicants.

## Deployment settings

`render.yaml` records the existing service's intended configuration. A repository file alone does not change an unmanaged service: mirror it in the existing service or deliberately import that existing resource into a Blueprint after reviewing its settings.

- Runtime: Static Site; branch `main`; repository root.
- Build: `npx --yes pnpm@10.34.3 install --frozen-lockfile --prod=false && npx --yes pnpm@10.34.3 run build:production`
- Publish directory: `dist`
- `NODE_VERSION`: `22` (supported LTS family; compatible with `.mise.toml`). The package also supports Node 24 LTS.
- `VITE_SUPABASE_URL`: `https://ycsqqktwzvqqblarqpfi.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: that project's **public anon or publishable key**, never a service-role or secret key.
- Rewrite: Source `/*`, Destination `/index.html`, Action **Rewrite**, not Redirect.

The production build fails if configuration is missing, points at localhost/another project, or exposes elevated credentials. Unit tests cover these checks. Vite variables are build-time/public; changing them requires a rebuild.

The rewrite is necessary for opening or refreshing `/admin/login`, `/dashboard/*`, `/projects/*`, `/apply`, and recovery/invitation links. Render serves real existing assets before applying the wildcard. See [Render routing documentation](https://render.com/docs/redirects-rewrites). Runtime selection follows [Render's Node version precedence](https://render.com/docs/node-version).

## Safe release order

1. Confirm hosted Supabase history and existing super-admin identity; back up public schema/records privately. Never commit backups or secrets.
2. Review `supabase db push --dry-run --linked --skip-vault`. Apply only the intended pending migrations, without reset or vault synchronization. Verify every local migration version matches hosted history and existing records remain intact. The current 19-version chain includes the admin form builder, preserved legacy drafts, role/activity retirement and owner-only read-notification deletion.
3. Confirm production Auth Site URL/redirects point at this HTTPS origin. Real email confirmation/recovery needs working Auth email delivery; preserve existing provider secrets and never push the local test Auth config to production.
4. Run type/unit/database/local end-to-end/build verification. The campaign test uses a regular admin, not just a super admin, to create/open/close recruitment and verifies an applicant can proceed only inside that window.
5. Commit/push reviewed source to `main` and deploy that exact revision on the existing Render service. Do not include `.DS_Store`, `.backups/`, `.env.local`, local runtime metadata or test reports.
6. Verify Render reports success, then fetch the public HTML and direct routes. Run public-page browser smoke checks and controlled login/admin checks. A successful build alone is not a verified live release.

## Day-to-day admin use

Everyone signs in at https://pict-robotics.onrender.com/signin. The trusted database role opens the applicant or staff dashboard automatically; old `/admin/login` bookmarks forward to that same screen. The owner's designated account was verified as an active, confirmed `super_admin` during the 2026-10-17 preflight. Account emails/passwords are not published in this repository. See [account role provisioning](ACCOUNT_ROLES.md) for preassigned roles and invitations.

- **Recruitment:** Admin → Recruitment → Cycles. Create/edit name, year group, opening/closing date and preference limit. Set status `open`, or use **Open recruitment** once the dates cover the current time. **Close recruitment** immediately stops new saves/submissions without deleting applications. An expired `open` campaign still rejects applications. Do not overwrite historical campaign dates just to make a screenshot's button work; create a new campaign when appropriate.
- **Events:** Admin → Events. Create title, summary, details, category, dates, venue, registration URL and optional image. Select `published` to display it publicly; draft stays private. Edit/delete controls persist changes subject to linked-record safeguards.
- **Application forms:** Admin → Form Builder → choose campaign → start blank or use the optional PICT starter → edit sections/fields/options → Preview → Publish form. New campaigns need a published form before Open recruitment. Builder drafts are private; existing saved applications retain their original form version. See the [complete guide](APPLICATION_FORM_BUILDER.md).
- **Website content:** Admin → Content for achievements, projects, team, gallery and homepage highlights. Publishing/unpublishing controls public visibility.
- **Applications:** Search/filter, open an applicant, assign/remove reviewers, add internal notes and move through allowed review stages. Shortlist before scheduling an interview. Save evaluations and explicitly set final results.
- **Notifications and interviews:** [Step-by-step guide](NOTIFICATIONS_AND_INTERVIEWS.md), including deletion of your own read notifications, mail-provider details and scheduling/rescheduling.
- **Access:** Only super admins see Settings and manage staff invitations/account roles. Admins perform all recruitment reviews and interviews; there is no recruiter role or activity screen. New accounts cannot self-select staff privileges.

An applicant's Continue button is intentionally disabled without a date-valid open campaign. Profile editing remains available independently. Local port-5173 accounts/data are separate from production; a local applicant account does not inherit the hosted account's super-admin role.

## Rollback and limitations

Keep Render's previous successful revision available, but do not blindly roll back to a pre-builder frontend: it cannot edit builder-backed applications. Prefer a reviewed forward fix rather than reversing schema or restoring over real applications. Private pre-release backups are in the local ignored `.backups/` directory, not on GitHub.

Member messages are in-app notifications, not external member emails. Auth mail, production load/cross-browser testing and operational monitoring must be checked separately. The existing Render workspace displayed a payment-method warning during inspection; no billing settings or paid service were changed. A static-site update does not require provisioning a paid service.
