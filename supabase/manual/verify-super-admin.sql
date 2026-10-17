-- READ ONLY. Run in the intended project's trusted Supabase SQL editor.
-- A row in Authentication or user_metadata.role is not sufficient authorization.
-- Replace REPLACE_WITH_YOUR_VERIFIED_EMAIL before running. Do not publish account emails.
select u.id, u.email, u.email_confirmed_at, u.banned_until, u.deleted_at,
       coalesce(array_agg(r.role::text) filter(where r.role is not null), '{}') as roles
from auth.users u
left join public.user_roles r on r.user_id = u.id
where lower(u.email) = lower('REPLACE_WITH_YOUR_VERIFIED_EMAIL')
group by u.id, u.email, u.email_confirmed_at, u.banned_until, u.deleted_at;

select version from supabase_migrations.schema_migrations order by version;
