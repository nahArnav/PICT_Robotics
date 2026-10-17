# One sign-in, trusted account roles

Everyone signs in at https://pict-robotics.onrender.com/signin. Old `/admin/login` bookmarks forward to the same screen. There is no role picker and no public admin registration.

| Trusted role | Destination | Access |
| --- | --- | --- |
| `applicant` | `/dashboard` | Own profile, application, tasks, interviews and results |
| `admin` | `/admin` | All applicant reviews, interviews, evaluations, recruitment operations, events and website CMS |
| `super_admin` | `/admin` | Admin capabilities plus staff invitations and account-role management |
| Missing/unrecognized role | No dashboard | Fails closed; operator must repair provisioning |

New people must create and verify an Auth account before signing in. The database trigger grants **only applicant** access. Signup metadata, an email typed into the form, a URL, local storage or the login screen cannot grant staff permissions. PostgreSQL RLS/RPC checks protect direct requests as well as the UI.

The eight-character signup prompt applies only when creating an account. Sign-in accepts an existing valid credential and delegates password verification to Supabase, so adopting the shared interface does not lock out older staff accounts.

## Assign staff before their next sign-in

Recommended: sign in as a super admin, open **Settings → User roles**, search the account email and choose the intended role. It is stored in `public.user_roles` against the verified Auth user's UUID. On their next sign-in the shared page opens the correct dashboard. A signed-in user's UI rechecks roles on focus/within 60 seconds; reload is immediate. Backend authorization checks current roles on every request.

You can also provision through the trusted Supabase SQL editor using [grant-staff-role.sql](../supabase/manual/grant-staff-role.sql): replace the email placeholder and explicitly choose `admin` or `super_admin`. The account must already exist and be confirmed/active. This manual script adds a role without removing existing roles; the highest trusted role wins. Use the application's role controls to demote/change roles safely, not manual row deletion.

If the account does not exist yet, create a staff invitation in Settings and share its one-use link with the intended person. Accepting it requires their matching confirmed email. There is deliberately no public email allow-list that automatically turns an arbitrary new signup into an administrator.

Do not put roles in `profiles`, `raw_user_meta_data` or frontend code. Do not share a default password or expose service-role keys. The first-owner bootstrap is documented separately in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Retired features

The recruiter role and audit/activity screen are removed. Only applicant, admin and super-admin roles are assignable; admins perform every reviewer duty without needing an assignment. Reviewer assignments remain optional work allocation, not a separate access tier. Only super admins can invite staff or change account roles.

The migration refuses to silently promote or demote existing recruiter accounts. The production preflight found none; one unused recruiter invitation is revoked, not upgraded to admin. PostgreSQL's old enum label is retained only for migration compatibility and is blocked by a database constraint and all role/invitation RPCs.

New application activity entries stop being recorded. Old audit rows are retained privately for data preservation, with browser/API access revoked even for super admins. Notification retry receipts store only opaque request UUIDs, not activity details, so removing the feed does not cause duplicate member messages. Supabase's own managed Auth/security diagnostics are outside this application feature and are unchanged.
