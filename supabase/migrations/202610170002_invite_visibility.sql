drop policy if exists "super admins read admin invitations" on public.admin_invites;
create policy "authorised invitation read" on public.admin_invites for select using(
 public.is_super_admin() or (public.is_admin() and created_by=auth.uid())
);
create or replace function public.revoke_admin_invite(p_invite_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare i public.admin_invites;
begin
 select * into i from public.admin_invites where id=p_invite_id for update;
 if not found or not(public.is_super_admin() or (public.is_admin() and i.created_by=auth.uid() and i.role='recruiter')) then raise exception 'You do not have permission to revoke this invitation'; end if;
 if i.accepted_at is not null then raise exception 'Accepted invitations cannot be revoked'; end if;
 if i.revoked_at is not null then return; end if;
 update public.admin_invites set revoked_at=now() where id=i.id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'admin_invite_revoked','admin_invites',i.id);
end; $$;
