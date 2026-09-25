-- Security and workflow hardening for the existing recruitment schema.
-- This migration is additive: it preserves existing records and never resets tables.

create extension if not exists pgcrypto with schema extensions;

-- Keep the profile email synchronized with Auth, and make role records complete audit targets.
alter table public.user_roles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add column if not exists skills text[] not null default '{}'::text[];
alter table public.profiles add column if not exists programming_languages text[] not null default '{}'::text[];
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.interviews add column if not exists duration_minutes integer not null default 20
  check (duration_minutes between 5 and 480);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_roles_touch on public.user_roles;
create trigger user_roles_touch before update on public.user_roles
for each row execute procedure public.touch_updated_at();

create or replace function public.create_applicant_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'applicant')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create or replace function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    perform set_config('pict.allow_profile_email_sync', 'true', true);
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute procedure public.sync_profile_email();

create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id is distinct from old.id
    or new.created_at is distinct from old.created_at then
    raise exception 'Profile ownership and creation time cannot be changed';
  end if;

  if new.email is distinct from old.email
    and coalesce(current_setting('pict.allow_profile_email_sync', true), '') <> 'true' then
    raise exception 'Update your email through Supabase Auth';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
for each row execute procedure public.guard_profile_update();

-- Recruiters only see records specifically assigned to them; admins retain full recruitment access.
create table if not exists public.application_reviewer_assignments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (application_id, reviewer_id)
);
create index if not exists application_reviewer_assignments_reviewer_idx
  on public.application_reviewer_assignments(reviewer_id, application_id);
alter table public.application_reviewer_assignments enable row level security;

create or replace function public.can_review_application(p_application_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or exists (
      select 1
      from public.application_reviewer_assignments assignment
      where assignment.application_id = p_application_id
        and assignment.reviewer_id = auth.uid()
    );
$$;

-- The browser may read roles but it can never mutate them directly.
drop policy if exists "roles super admin manage" on public.user_roles;
drop policy if exists "roles self or staff read" on public.user_roles;
create policy "roles self or super admin read" on public.user_roles
for select using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self or authorised reviewer read" on public.profiles
for select using (
  id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.applications application
    join public.application_reviewer_assignments assignment on assignment.application_id = application.id
    where application.applicant_id = profiles.id and assignment.reviewer_id = auth.uid()
  )
);

-- Applications and their child data are only written through trusted RPCs below.
drop policy if exists "applications owner draft create" on public.applications;
drop policy if exists "applications owner draft update" on public.applications;
drop policy if exists "applications staff update" on public.applications;
drop policy if exists "applications owner or staff read" on public.applications;
create policy "applications own or assigned staff read" on public.applications
for select using (applicant_id = auth.uid() or public.can_review_application(id));

drop policy if exists "preferences owner or staff read" on public.application_domain_preferences;
drop policy if exists "preferences owner draft write" on public.application_domain_preferences;
drop policy if exists "preferences staff manage" on public.application_domain_preferences;
create policy "preferences own or assigned staff read" on public.application_domain_preferences
for select using (
  exists (
    select 1 from public.applications application
    where application.id = application_id
      and (application.applicant_id = auth.uid() or public.can_review_application(application.id))
  )
);

drop policy if exists "answers owner or staff read" on public.application_answers;
drop policy if exists "answers owner draft write" on public.application_answers;
drop policy if exists "answers staff manage" on public.application_answers;
create policy "answers own or assigned staff read" on public.application_answers
for select using (
  exists (
    select 1 from public.applications application
    where application.id = application_id
      and (application.applicant_id = auth.uid() or public.can_review_application(application.id))
  )
);

drop policy if exists "interviews owner or staff read" on public.interviews;
drop policy if exists "interviews staff manage" on public.interviews;
create policy "interviews applicant or assigned staff read" on public.interviews
for select using (
  exists (
    select 1 from public.applications application
    where application.id = interviews.application_id
      and (application.applicant_id = auth.uid() or public.can_review_application(application.id))
  )
);

drop policy if exists "evaluations staff only" on public.evaluations;
create policy "evaluations evaluator or admin read" on public.evaluations
for select using (evaluator_id = auth.uid() or public.is_admin());

create policy "assignment admin read" on public.application_reviewer_assignments
for select using (public.is_admin() or reviewer_id = auth.uid());
create policy "assignment admin manage" on public.application_reviewer_assignments
for all using (public.is_admin()) with check (public.is_admin());

-- Client-side notification updates may mark only the caller's own notifications as read.
drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own read-state update" on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications staff manage" on public.notifications;

create or replace function public.guard_notification_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is distinct from old.user_id
    or new.title is distinct from old.title
    or new.message is distinct from old.message
    or new.type is distinct from old.type
    or new.created_at is distinct from old.created_at then
    raise exception 'Only notification read state may be changed';
  end if;

  if new.read and not old.read and new.read_at is null then
    new.read_at = now();
  elsif not new.read then
    new.read_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_guard on public.notifications;
create trigger notifications_guard before update on public.notifications
for each row execute procedure public.guard_notification_update();

-- Invitation secrets are stored only as SHA-256 hashes. Existing raw UUIDs are migrated once,
-- then removed from stored rows. A UUID still gives 122 bits of entropy and is shown only once.
alter table public.admin_invites add column if not exists token_hash text;
alter table public.admin_invites add column if not exists revoked_at timestamptz;
alter table public.admin_invites add column if not exists accepted_by uuid references public.profiles(id) on delete set null;
update public.admin_invites
set token_hash = encode(extensions.digest(token::text, 'sha256'), 'hex')
where token_hash is null and token is not null;
alter table public.admin_invites alter column token drop not null;
update public.admin_invites set token = null where token is not null;
alter table public.admin_invites alter column token_hash set not null;

drop policy if exists "super admins manage admin invitations" on public.admin_invites;
create policy "super admins read admin invitations" on public.admin_invites
for select using (public.is_super_admin());

create or replace function public.create_admin_invite(
  p_email text,
  p_role public.app_role,
  p_expires_at timestamptz default (now() + interval '7 days')
) returns table (id uuid, token uuid, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  invitation_token uuid := gen_random_uuid();
  caller_role public.app_role := public.current_role();
begin
  if auth.uid() is null or caller_role not in ('admin', 'super_admin') then
    raise exception 'You do not have permission to create admin invitations';
  end if;
  if p_email is null or btrim(p_email) = '' or position('@' in p_email) = 0 then
    raise exception 'A valid invitee email is required';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception 'Invitation expiry must be between now and 30 days from now';
  end if;
  if caller_role = 'admin' and p_role <> 'recruiter' then
    raise exception 'Admins may invite recruiters only';
  end if;
  if caller_role = 'super_admin' and p_role not in ('recruiter', 'admin', 'super_admin') then
    raise exception 'Invalid invitation role';
  end if;

  insert into public.admin_invites (email, role, token, token_hash, created_by, expires_at)
  values (lower(btrim(p_email)), p_role, null, encode(extensions.digest(invitation_token::text, 'sha256'), 'hex'), auth.uid(), p_expires_at)
  returning admin_invites.id, admin_invites.expires_at into id, expires_at;

  token := invitation_token;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'admin_invite_created', 'admin_invites', id,
    jsonb_build_object('email', lower(btrim(p_email)), 'role', p_role, 'expires_at', expires_at));
  return next;
end;
$$;

create or replace function public.revoke_admin_invite(p_invite_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare invitation public.admin_invites;
begin
  if not public.is_super_admin() then
    raise exception 'You do not have permission to revoke invitations';
  end if;
  select * into invitation from public.admin_invites where id = p_invite_id for update;
  if not found then raise exception 'Invitation not found'; end if;
  if invitation.accepted_at is not null then raise exception 'Accepted invitations cannot be revoked'; end if;
  update public.admin_invites set revoked_at = now() where id = invitation.id and revoked_at is null;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'admin_invite_revoked', 'admin_invites', invitation.id);
end;
$$;

create or replace function public.accept_admin_invite(p_token uuid) returns public.app_role
language plpgsql security definer set search_path = public as $$
declare invitation public.admin_invites;
begin
  if auth.uid() is null then raise exception 'Sign in before accepting an invitation'; end if;
  select * into invitation
  from public.admin_invites
  where token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  for update;
  if not found then raise exception 'This invitation is invalid, expired, revoked, or already used'; end if;
  if not exists (
    select 1 from auth.users
    where id = auth.uid() and email_confirmed_at is not null
  ) then
    raise exception 'Verify your email address before accepting this invitation';
  end if;
  if lower(invitation.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'This invitation belongs to a different email address';
  end if;

  delete from public.user_roles where user_id = auth.uid() and role = 'applicant';
  insert into public.user_roles (user_id, role)
  values (auth.uid(), invitation.role)
  on conflict (user_id, role) do nothing;
  update public.admin_invites
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invitation.id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'admin_invite_accepted', 'admin_invites', invitation.id,
    jsonb_build_object('role', invitation.role));
  return invitation.role;
end;
$$;

-- Draft persistence and submission are the only applicant write paths. They are transactional
-- and do not trust a browser-supplied applicant id or lifecycle status.
create or replace function public.save_application_draft(
  p_recruitment_cycle_id uuid,
  p_motivation text,
  p_experience_summary text,
  p_github_url text,
  p_portfolio_url text,
  p_domain_ids uuid[],
  p_answers jsonb default '[]'::jsonb
) returns public.applications
language plpgsql security definer set search_path = public as $$
declare
  application public.applications;
  cycle public.recruitment_cycles;
  answer_record record;
begin
  if auth.uid() is null or public.current_role() <> 'applicant' then
    raise exception 'Only applicants may save applications';
  end if;
  select * into cycle from public.recruitment_cycles where id = p_recruitment_cycle_id;
  if not found or cycle.status <> 'open' or now() not between cycle.application_open and cycle.application_close then
    raise exception 'This recruitment cycle is not accepting applications';
  end if;
  if coalesce(cardinality(p_domain_ids), 0) > 3 then
    raise exception 'Select no more than three domain preferences';
  end if;
  if cardinality(p_domain_ids) <> cardinality(array(select distinct value from unnest(p_domain_ids) value)) then
    raise exception 'Domain preferences must be unique';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_domain_ids, '{}'::uuid[])) domain_id
    left join public.domains domain on domain.id = domain_id and domain.active
    where domain.id is null
  ) then
    raise exception 'Every selected domain must be active';
  end if;
  if jsonb_typeof(coalesce(p_answers, '[]'::jsonb)) <> 'array' then
    raise exception 'Application answers must be an array';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_answers, '[]'::jsonb)) as answer(question_id uuid, answer jsonb)
    left join public.recruitment_questions question
      on question.id = answer.question_id and question.recruitment_cycle_id = p_recruitment_cycle_id
    where question.id is null
  ) then
    raise exception 'An answer belongs to a different recruitment cycle';
  end if;

  select * into application
  from public.applications
  where applicant_id = auth.uid() and recruitment_cycle_id = p_recruitment_cycle_id
  for update;
  if found and application.status <> 'draft' then
    raise exception 'A submitted application cannot be edited';
  end if;

  insert into public.applications (
    applicant_id, recruitment_cycle_id, status, motivation, experience_summary, github_url, portfolio_url
  ) values (
    auth.uid(), p_recruitment_cycle_id, 'draft', nullif(btrim(p_motivation), ''),
    nullif(btrim(p_experience_summary), ''), nullif(btrim(p_github_url), ''), nullif(btrim(p_portfolio_url), '')
  ) on conflict (applicant_id, recruitment_cycle_id) do update set
    motivation = excluded.motivation,
    experience_summary = excluded.experience_summary,
    github_url = excluded.github_url,
    portfolio_url = excluded.portfolio_url
  returning * into application;

  delete from public.application_domain_preferences where application_id = application.id;
  insert into public.application_domain_preferences (application_id, domain_id, preference_order)
  select application.id, domain_id, preference_order
  from unnest(coalesce(p_domain_ids, '{}'::uuid[])) with ordinality as preferences(domain_id, preference_order);

  delete from public.application_answers where application_id = application.id;
  for answer_record in
    select * from jsonb_to_recordset(coalesce(p_answers, '[]'::jsonb)) as answer(question_id uuid, answer jsonb)
  loop
    insert into public.application_answers (application_id, question_id, answer)
    values (application.id, answer_record.question_id, answer_record.answer);
  end loop;
  return application;
end;
$$;

create or replace function public.submit_application(p_application_id uuid) returns public.applications
language plpgsql security definer set search_path = public as $$
declare application public.applications; cycle public.recruitment_cycles;
begin
  if auth.uid() is null or public.current_role() <> 'applicant' then
    raise exception 'Only applicants may submit applications';
  end if;
  select * into application from public.applications
  where id = p_application_id and applicant_id = auth.uid() for update;
  if not found then raise exception 'Application not found'; end if;
  if application.status <> 'draft' then raise exception 'Only draft applications may be submitted'; end if;
  select * into cycle from public.recruitment_cycles where id = application.recruitment_cycle_id;
  if cycle.status <> 'open' or now() not between cycle.application_open and cycle.application_close then
    raise exception 'This recruitment cycle is not accepting applications';
  end if;
  if coalesce(trim(application.motivation), '') = ''
    or (select count(*) from public.application_domain_preferences where application_id = application.id) < 1 then
    raise exception 'Complete the required application fields before submitting';
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid()
      and coalesce(trim(profile.full_name), '') <> ''
      and coalesce(trim(profile.phone), '') <> ''
      and coalesce(trim(profile.branch), '') <> ''
      and profile.year is not null
      and coalesce(trim(profile.division), '') <> ''
  ) then
    raise exception 'Complete your required profile details before submitting';
  end if;
  if exists (
    select 1 from public.recruitment_questions question
    where question.recruitment_cycle_id = application.recruitment_cycle_id
      and question.active and question.required
      and not exists (
        select 1 from public.application_answers answer
        where answer.application_id = application.id
          and answer.question_id = question.id
          and coalesce(nullif(trim(answer.answer #>> '{}'), ''), '') <> ''
      )
  ) then
    raise exception 'Answer every required recruitment question before submitting';
  end if;

  update public.applications
  set status = 'submitted', submitted_at = now(), reviewed_at = null, reviewed_by = null
  where id = application.id
  returning * into application;
  insert into public.notifications (user_id, title, message, type)
  values (application.applicant_id, 'Application submitted', 'Your application was submitted successfully.', 'application');
  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'application_submitted', 'applications', application.id);
  return application;
end;
$$;

-- Status changes are server-controlled and auditable. Assigned recruiters may progress only the
-- records they own; admins can make any valid transition.
create or replace function public.update_application_status(
  p_application_id uuid,
  p_status public.application_status
) returns public.applications
language plpgsql security definer set search_path = public as $$
declare application public.applications;
begin
  if not public.can_review_application(p_application_id) then
    raise exception 'You do not have permission to update this application';
  end if;
  select * into application from public.applications where id = p_application_id for update;
  if not found then raise exception 'Application not found'; end if;
  if not (
    (application.status = 'submitted' and p_status = 'under_review')
    or (application.status = 'under_review' and p_status in ('shortlisted', 'rejected', 'waitlisted'))
    or (application.status = 'shortlisted' and p_status in ('interview_scheduled', 'rejected', 'waitlisted'))
    or (application.status = 'interview_scheduled' and p_status in ('selected', 'waitlisted', 'rejected'))
  ) then
    raise exception 'This application status transition is not allowed';
  end if;
  update public.applications
  set status = p_status, reviewed_at = now(), reviewed_by = auth.uid()
  where id = application.id
  returning * into application;
  insert into public.notifications (user_id, title, message, type)
  values (application.applicant_id, 'Application status updated', 'Your recruitment application status has been updated.', 'application_status');
  insert into public.audit_logs (actor_id, action, entity_type, entity_id,
    metadata) values (auth.uid(), 'application_status_updated', 'applications', application.id,
    jsonb_build_object('from', application.status, 'to', p_status));
  return application;
end;
$$;

create or replace function public.prevent_interview_overlap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'scheduled' and new.interviewer_id is not null and exists (
    select 1 from public.interviews existing
    where existing.interviewer_id = new.interviewer_id
      and existing.status = 'scheduled'
      and existing.id <> coalesce(new.id, gen_random_uuid())
      and tstzrange(existing.scheduled_at, existing.scheduled_at + make_interval(mins => existing.duration_minutes), '[)')
          && tstzrange(new.scheduled_at, new.scheduled_at + make_interval(mins => new.duration_minutes), '[)')
  ) then
    raise exception 'The selected interviewer is already booked for that time';
  end if;
  return new;
end;
$$;

drop trigger if exists interviews_prevent_overlap on public.interviews;
create trigger interviews_prevent_overlap before insert or update of interviewer_id, scheduled_at, duration_minutes, status
on public.interviews for each row execute procedure public.prevent_interview_overlap();

-- Audit logs are immutable to API clients. Sensitive table triggers cover direct admin CMS actions.
drop policy if exists "audit staff read" on public.audit_logs;
drop policy if exists "audit staff insert" on public.audit_logs;
create policy "audit super admin read" on public.audit_logs
for select using (public.is_super_admin());

create or replace function public.record_audit_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare row_id uuid; action_name text;
begin
  if TG_TABLE_NAME = 'applications' and TG_OP = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;
  if TG_TABLE_NAME = 'user_roles' and coalesce(new.role, old.role) = 'applicant' then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;
  row_id := coalesce(new.id, old.id);
  action_name := lower(TG_TABLE_NAME) || '_' || lower(TG_OP);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values (auth.uid(), action_name, TG_TABLE_NAME, row_id);
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists audit_user_roles on public.user_roles;
create trigger audit_user_roles after insert or update or delete on public.user_roles
for each row execute procedure public.record_audit_change();
drop trigger if exists audit_recruitment_cycles on public.recruitment_cycles;
create trigger audit_recruitment_cycles after insert or update or delete on public.recruitment_cycles
for each row execute procedure public.record_audit_change();
drop trigger if exists audit_achievements on public.achievements;
create trigger audit_achievements after insert or update or delete on public.achievements
for each row execute procedure public.record_audit_change();
drop trigger if exists audit_projects on public.projects;
create trigger audit_projects after insert or update or delete on public.projects
for each row execute procedure public.record_audit_change();
drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements after insert or update or delete on public.announcements
for each row execute procedure public.record_audit_change();
drop trigger if exists audit_club_events on public.club_events;
create trigger audit_club_events after insert or update or delete on public.club_events
for each row execute procedure public.record_audit_change();

revoke all on function public.create_admin_invite(text, public.app_role, timestamptz) from public;
revoke all on function public.revoke_admin_invite(uuid) from public;
revoke all on function public.accept_admin_invite(uuid) from public;
revoke all on function public.save_application_draft(uuid, text, text, text, text, uuid[], jsonb) from public;
revoke all on function public.submit_application(uuid) from public;
revoke all on function public.update_application_status(uuid, public.application_status) from public;
grant execute on function public.create_admin_invite(text, public.app_role, timestamptz) to authenticated;
grant execute on function public.revoke_admin_invite(uuid) to authenticated;
grant execute on function public.accept_admin_invite(uuid) to authenticated;
grant execute on function public.save_application_draft(uuid, text, text, text, text, uuid[], jsonb) to authenticated;
grant execute on function public.submit_application(uuid) to authenticated;
grant execute on function public.update_application_status(uuid, public.application_status) to authenticated;
