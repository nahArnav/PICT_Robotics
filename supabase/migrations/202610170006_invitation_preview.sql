-- A bearer invitation reveals only its own recipient, role and expiry. Acceptance still
-- requires a verified Auth account with the matching email and a currently authorised inviter.
create or replace function public.inspect_admin_invite(p_token uuid)
returns table(email text,role public.app_role,expires_at timestamptz)
language sql stable security definer set search_path=public,extensions as $$
 select i.email,i.role,i.expires_at from public.admin_invites i
 where i.token_hash=encode(digest(p_token::text,'sha256'),'hex') and i.accepted_at is null and i.revoked_at is null and i.expires_at>now()
 and exists(select 1 from public.user_roles r where r.user_id=i.created_by and (r.role='super_admin' or (r.role='admin' and i.role='recruiter')));
$$;
revoke all on function public.inspect_admin_invite(uuid) from public;
grant execute on function public.inspect_admin_invite(uuid) to anon,authenticated;
