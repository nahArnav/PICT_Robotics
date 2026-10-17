-- TRUSTED SQL EDITOR ONLY. This is an explicit, one-time provisioning operation,
-- NOT an application migration and NEVER executed by the browser or test runner.
-- Run verify-super-admin.sql first; do not run this if the role already exists.
-- Create/verify this Auth account through normal Auth before provisioning it.
begin;
do $$
declare account_id uuid; account_email text := 'REPLACE_WITH_YOUR_VERIFIED_EMAIL';
begin
  select id into account_id from auth.users
  where lower(email) = lower(account_email)
    and email_confirmed_at is not null and deleted_at is null
    and (banned_until is null or banned_until <= now());
  if account_id is null then
    raise exception 'Set the intended account email, then create and verify that active Auth account first';
  end if;
  perform pg_advisory_xact_lock(610170001);
  insert into public.user_roles(user_id, role)
  values(account_id, 'super_admin')
  on conflict(user_id, role) do nothing;
end;
$$;
commit;
