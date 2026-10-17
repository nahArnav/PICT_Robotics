-- Retire the recruiter role and activity feature without rewriting migration history,
-- deleting historical records, or automatically expanding an account's privileges.
do $$
begin
 if exists(select 1 from public.user_roles where role='recruiter') then
   raise exception 'Existing recruiter accounts require an explicit admin/applicant role decision before this migration';
 end if;
end; $$;
alter table public.user_roles add constraint supported_account_role
 check(role in ('applicant','admin','super_admin'));
-- Old enum label remains inert for PostgreSQL/migration compatibility, not assignable.
update public.admin_invites set revoked_at=now()
 where role='recruiter' and accepted_at is null and revoked_at is null;
alter table public.admin_invites add constraint supported_invitation_role
 check(role in ('admin','super_admin') or accepted_at is not null or revoked_at is not null);

create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path=public as $$
 select role from public.user_roles where user_id=auth.uid() and public.is_active_account()
 and role in ('applicant','admin','super_admin')
 order by case role when 'super_admin' then 1 when 'admin' then 2 else 3 end limit 1;
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path=public as $$ select public.is_admin(); $$;
create or replace function public.can_review_application(p_application_id uuid) returns boolean
language sql stable security definer set search_path=public as $$ select public.is_admin(); $$;
create or replace function public.staff_directory() returns table(id uuid,full_name text,email text,role public.app_role)
language sql stable security definer set search_path=public as $$
 select p.id,p.full_name,p.email,r.role from public.profiles p
 join auth.users u on u.id=p.id and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
 join lateral(select role from public.user_roles where user_id=p.id and role in ('admin','super_admin')
   order by case role when 'super_admin' then 0 else 1 end limit 1) r on true
 where public.is_admin() order by p.full_name;
$$;
create or replace function public.guard_reviewer_assignment() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.user_roles r join auth.users u on u.id=r.user_id
   where r.user_id=new.reviewer_id and r.role in ('admin','super_admin') and u.deleted_at is null
   and (u.banned_until is null or u.banned_until<=now())) then raise exception 'Choose an active admin reviewer'; end if;
 if auth.uid() is not null then new.assigned_by:=auth.uid(); end if;
 return new;
end; $$;
-- The assignment guard also checks interviewers inserted by schedule_interview.

create or replace function public.set_user_role(p_user_id uuid,p_role public.app_role) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(610170001);
 if not public.is_super_admin() then raise exception 'Super admin access required'; end if;
 if p_role is null or p_role not in ('applicant','admin','super_admin') then raise exception 'Unsupported account role'; end if;
 if p_user_id=auth.uid() and p_role<>'super_admin' then raise exception 'Ask another super admin to change your own role'; end if;
 delete from public.user_roles where user_id=p_user_id;
 insert into public.user_roles(user_id,role) values(p_user_id,p_role);
end; $$;
drop policy if exists "authorised invitation read" on public.admin_invites;
create policy "super admin invitations" on public.admin_invites for select using(public.is_super_admin());
create or replace function public.create_admin_invite(p_email text,p_role public.app_role,p_expires_at timestamptz default now()+interval '7 days')
returns table(id uuid,token uuid,expires_at timestamptz)
language plpgsql security definer set search_path=public,extensions as $$
declare secret uuid:=gen_random_uuid();
begin
 if not public.is_super_admin() then raise exception 'Super admin access required'; end if;
 if p_role is null or p_role not in ('admin','super_admin') then raise exception 'Choose an admin or super admin role'; end if;
 if p_email is null or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'A valid invitee email is required'; end if;
 if p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'Invalid invitation expiry'; end if;
 insert into public.admin_invites(email,role,token,token_hash,created_by,expires_at)
 values(lower(trim(p_email)),p_role,null,encode(digest(secret::text,'sha256'),'hex'),auth.uid(),p_expires_at)
 returning admin_invites.id,admin_invites.expires_at into id,expires_at;
 token:=secret;
 return next;
end; $$;
create or replace function public.inspect_admin_invite(p_token uuid)
returns table(email text,role public.app_role,expires_at timestamptz)
language sql stable security definer set search_path=public,extensions as $$
 select i.email,i.role,i.expires_at from public.admin_invites i
 where i.token_hash=encode(digest(p_token::text,'sha256'),'hex') and i.accepted_at is null
 and i.revoked_at is null and i.expires_at>now() and i.role in ('admin','super_admin')
 and exists(select 1 from public.user_roles r join auth.users u on u.id=r.user_id
   where r.user_id=i.created_by and r.role='super_admin' and u.deleted_at is null
   and (u.banned_until is null or u.banned_until<=now()));
$$;
create or replace function public.accept_admin_invite(p_token uuid) returns public.app_role
language plpgsql security definer set search_path=public,extensions as $$
declare i public.admin_invites; account_email text;
begin
 if not public.is_active_account() then raise exception 'Sign in with an active account before accepting an invitation'; end if;
 perform pg_advisory_xact_lock(610170001);
 select * into i from public.admin_invites where token_hash=encode(digest(p_token::text,'sha256'),'hex')
 and accepted_at is null and revoked_at is null and expires_at>now() and role in ('admin','super_admin') for update;
 if not found then raise exception 'This invitation is invalid, expired, revoked, or already used'; end if;
 select email into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if account_email is null then raise exception 'Verify your email address before accepting this invitation'; end if;
 if lower(i.email)<>lower(account_email) then raise exception 'This invitation belongs to a different email address'; end if;
 if not exists(select 1 from public.user_roles r join auth.users u on u.id=r.user_id
   where r.user_id=i.created_by and r.role='super_admin' and u.deleted_at is null
   and (u.banned_until is null or u.banned_until<=now())) then raise exception 'The inviter no longer has permission to grant this role'; end if;
 delete from public.user_roles where user_id=auth.uid() and role='applicant';
 insert into public.user_roles(user_id,role) values(auth.uid(),i.role) on conflict do nothing;
 update public.admin_invites set accepted_at=now(),accepted_by=auth.uid() where id=i.id;
 return i.role;
end; $$;
create or replace function public.revoke_admin_invite(p_invite_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare i public.admin_invites;
begin
 if not public.is_super_admin() then raise exception 'Super admin access required'; end if;
 select * into i from public.admin_invites where id=p_invite_id for update;
 if not found then raise exception 'Invitation not found'; end if;
 if i.accepted_at is not null then raise exception 'Accepted invitations cannot be revoked'; end if;
 update public.admin_invites set revoked_at=coalesce(revoked_at,now()) where id=i.id;
end; $$;

-- Notification retry safety is operational state, not an activity log. Keep only
-- opaque request UUIDs, including old receipts, so removal cannot cause duplicates.
create table public.member_notification_receipts(request_id uuid primary key);
alter table public.member_notification_receipts enable row level security;
revoke all on public.member_notification_receipts from public,anon,authenticated;
insert into public.member_notification_receipts(request_id)
 select distinct entity_id from public.audit_logs
 where action='member_notifications_sent' and entity_id is not null on conflict do nothing;
create or replace function public.send_member_notifications(p_user_ids uuid[],p_title text,p_message text,p_request_id uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare count_sent integer;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if p_user_ids is null or cardinality(p_user_ids) not between 1 and 200 or p_title is null or p_message is null
 or length(trim(p_title)) not between 1 and 200 or length(trim(p_message)) not between 1 and 10000 or p_request_id is null then raise exception 'Invalid message or recipient count'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,1));
 if exists(select 1 from public.member_notification_receipts where request_id=p_request_id) then return 0; end if;
 insert into public.notifications(user_id,title,message,type)
 select id,p_title,p_message,'admin_mail' from public.profiles where id=any(p_user_ids);
 get diagnostics count_sent=row_count;
 insert into public.member_notification_receipts(request_id) values(p_request_id);
 return count_sent;
end; $$;

-- Historical records are retained privately, not erased. Stop all table triggers
-- producing activity and suppress inserts from compatibility RPC definitions.
do $$
declare t record;
begin
 for t in select n.nspname,c.relname,g.tgname from pg_trigger g
 join pg_class c on c.oid=g.tgrelid join pg_namespace n on n.oid=c.relnamespace
 where not g.tgisinternal and n.nspname='public' and g.tgfoid='public.record_audit_change()'::regprocedure loop
   execute format('drop trigger %I on %I.%I',t.tgname,t.nspname,t.relname);
 end loop;
end; $$;
create function public.discard_retired_activity() returns trigger
language plpgsql set search_path=public as $$ begin return null; end; $$;
create trigger discard_retired_activity before insert on public.audit_logs
 for each row execute function public.discard_retired_activity();
revoke all on function public.discard_retired_activity() from public,anon,authenticated;
revoke all on public.audit_logs from public,anon,authenticated;
