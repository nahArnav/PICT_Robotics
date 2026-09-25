-- Invite-only admin provisioning. There is intentionally no public admin-role signup.
create table public.admin_invites (
  id uuid primary key default gen_random_uuid(), email text not null, role public.app_role not null check (role in ('recruiter','admin','super_admin')),
  token uuid not null unique default gen_random_uuid(), created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'), accepted_at timestamptz, created_at timestamptz not null default now()
);
alter table public.admin_invites enable row level security;
create policy "super admins manage admin invitations" on public.admin_invites for all using (public.is_super_admin()) with check (public.is_super_admin());

create or replace function public.accept_admin_invite(p_token uuid) returns public.app_role
language plpgsql security definer set search_path = public as $$
declare invitation public.admin_invites;
begin
  select * into invitation from public.admin_invites where token = p_token and accepted_at is null and expires_at > now() for update;
  if not found then raise exception 'This invitation is invalid or has expired'; end if;
  if not exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then raise exception 'Verify your email address before accepting this invitation'; end if;
  if lower(invitation.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'This invitation belongs to a different email address'; end if;
  delete from public.user_roles where user_id = auth.uid() and role = 'applicant';
  insert into public.user_roles(user_id, role) values (auth.uid(), invitation.role) on conflict (user_id, role) do nothing;
  update public.admin_invites set accepted_at = now() where id = invitation.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'admin_invite_accepted', 'admin_invites', invitation.id, jsonb_build_object('role', invitation.role));
  return invitation.role;
end; $$;
grant execute on function public.accept_admin_invite(uuid) to authenticated;
