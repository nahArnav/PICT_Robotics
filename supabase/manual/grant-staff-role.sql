-- TRUSTED SUPABASE SQL EDITOR ONLY. Never run this from a browser client.
-- Explicit operator action; not a migration and never executed automatically.
-- Prefer Admin > Settings > User roles for serialized role changes.
-- This script only ADDS a staff role; it does not demote anyone or delete roles.
begin;
do $$
declare
  account_email text := 'REPLACE_WITH_YOUR_VERIFIED_EMAIL';
  requested_role public.app_role := 'admin'; -- admin or super_admin
  account_id uuid;
begin
  if requested_role not in ('admin', 'super_admin') then
    raise exception 'Choose an explicit staff role';
  end if;
  select id into account_id from auth.users
  where lower(email) = lower(trim(account_email))
    and email_confirmed_at is not null and deleted_at is null
    and (banned_until is null or banned_until <= now());
  if account_id is null then
    raise exception 'Create and confirm the intended active Auth account first';
  end if;
  perform pg_advisory_xact_lock(610170001);
  insert into public.user_roles(user_id, role)
  values (account_id, requested_role)
  on conflict (user_id, role) do nothing;
end;
$$;
commit;
