-- PICT Robotics recruitment platform: relational schema, authorization and storage.
-- Apply with the Supabase CLI or SQL editor before deploying the matching frontend.

create extension if not exists pgcrypto;

create type public.app_role as enum ('applicant', 'recruiter', 'admin', 'super_admin');
create type public.application_status as enum ('draft', 'submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'selected', 'waitlisted', 'rejected', 'withdrawn');
create type public.cycle_status as enum ('draft', 'upcoming', 'open', 'closed', 'completed');
create type public.interview_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', email text not null unique, phone text, roll_number text unique,
  branch text, year text check (year in ('FY', 'SY')), division text, profile_photo_url text,
  github_url text, linkedin_url text, portfolio_url text, bio text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'applicant', created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = auth.uid()
  order by case role when 'super_admin' then 1 when 'admin' then 2 when 'recruiter' then 3 else 4 end limit 1;
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() in ('recruiter', 'admin', 'super_admin'), false);
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() in ('admin', 'super_admin'), false);
$$;
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() = 'super_admin', false);
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create or replace function public.create_applicant_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  insert into public.user_roles (user_id, role) values (new.id, 'applicant');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_applicant_profile();
create trigger profiles_touch before update on public.profiles for each row execute procedure public.touch_updated_at();

create table public.recruitment_cycles (
  id uuid primary key default gen_random_uuid(), name text not null, academic_year text not null, target_batch text not null,
  description text, application_open timestamptz not null, application_close timestamptz not null,
  status public.cycle_status not null default 'draft', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (application_close > application_open)
);
create trigger recruitment_cycles_touch before update on public.recruitment_cycles for each row execute procedure public.touch_updated_at();

create table public.domains (
  id uuid primary key default gen_random_uuid(), name text not null unique, short_description text, detailed_description text,
  icon text, image_url text, active boolean not null default true, display_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger domains_touch before update on public.domains for each row execute procedure public.touch_updated_at();

create table public.recruitment_questions (
  id uuid primary key default gen_random_uuid(), recruitment_cycle_id uuid not null references public.recruitment_cycles(id) on delete cascade,
  question text not null, question_type text not null check (question_type in ('short_text','long_text','single_choice','multi_choice','url','number')),
  required boolean not null default false, display_order integer not null default 0, active boolean not null default true, options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(), applicant_id uuid not null references public.profiles(id) on delete cascade,
  recruitment_cycle_id uuid not null references public.recruitment_cycles(id) on delete restrict,
  status public.application_status not null default 'draft', motivation text, experience_summary text,
  github_url text, portfolio_url text, submitted_at timestamptz, reviewed_at timestamptz, reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (applicant_id, recruitment_cycle_id), check ((status <> 'submitted') or submitted_at is not null)
);
create index applications_applicant_idx on public.applications(applicant_id);
create index applications_cycle_status_idx on public.applications(recruitment_cycle_id, status);
create trigger applications_touch before update on public.applications for each row execute procedure public.touch_updated_at();

create table public.application_domain_preferences (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  domain_id uuid not null references public.domains(id) on delete restrict, preference_order smallint not null check (preference_order between 1 and 3),
  created_at timestamptz not null default now(), unique(application_id, domain_id), unique(application_id, preference_order)
);
create table public.application_answers (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  question_id uuid not null references public.recruitment_questions(id) on delete restrict, answer jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(application_id, question_id)
);
create trigger application_answers_touch before update on public.application_answers for each row execute procedure public.touch_updated_at();

create table public.recruitment_rounds (
  id uuid primary key default gen_random_uuid(), recruitment_cycle_id uuid not null references public.recruitment_cycles(id) on delete cascade,
  name text not null, description text, round_type text not null, start_at timestamptz, end_at timestamptz, active boolean not null default true,
  created_at timestamptz not null default now(), check (end_at is null or start_at is null or end_at > start_at)
);
create table public.interviews (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  round_id uuid references public.recruitment_rounds(id) on delete set null, interviewer_id uuid references public.profiles(id) on delete set null,
  scheduled_at timestamptz not null, location text, meeting_url text, status public.interview_status not null default 'scheduled', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index interviews_application_idx on public.interviews(application_id);
create index interviews_interviewer_schedule_idx on public.interviews(interviewer_id, scheduled_at) where status = 'scheduled';
create trigger interviews_touch before update on public.interviews for each row execute procedure public.touch_updated_at();
create table public.evaluations (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  round_id uuid references public.recruitment_rounds(id) on delete set null, evaluator_id uuid not null references public.profiles(id),
  technical_score numeric(5,2), communication_score numeric(5,2), problem_solving_score numeric(5,2), teamwork_score numeric(5,2), overall_score numeric(5,2),
  feedback text, recommendation text check (recommendation in ('strong_yes','yes','maybe','no')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(application_id, round_id, evaluator_id)
);
create trigger evaluations_touch before update on public.evaluations for each row execute procedure public.touch_updated_at();

create table public.achievements (
  id uuid primary key default gen_random_uuid(), title text not null, description text not null, year integer not null,
  category text, image_url text, external_url text, featured boolean not null default false, published boolean not null default false,
  display_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), title text not null, description text not null, year integer not null,
  category text, image_url text, repository_url text, demo_url text, featured boolean not null default false, published boolean not null default false,
  display_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(), title text not null, content text not null, type text not null default 'general',
  published boolean not null default false, published_at timestamptz, expires_at timestamptz, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (expires_at is null or published_at is null or expires_at > published_at)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, message text not null, type text not null default 'general', read boolean not null default false, created_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id) on delete set null, action text not null,
  entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

-- Application submission is server-safe: only owner, open cycle, complete core data; creates a notification atomically.
create or replace function public.submit_application(p_application_id uuid) returns public.applications
language plpgsql security definer set search_path = public as $$
declare a public.applications; c public.recruitment_cycles;
begin
  select * into a from public.applications where id = p_application_id and applicant_id = auth.uid() for update;
  if not found then raise exception 'Application not found'; end if;
  select * into c from public.recruitment_cycles where id = a.recruitment_cycle_id;
  if c.status <> 'open' or now() not between c.application_open and c.application_close then raise exception 'This recruitment cycle is not accepting applications'; end if;
  if coalesce(trim(a.motivation), '') = '' or (select count(*) from public.application_domain_preferences where application_id = a.id) < 1 then raise exception 'Complete the required application fields before submitting'; end if;
  update public.applications set status = 'submitted', submitted_at = now() where id = a.id returning * into a;
  insert into public.notifications(user_id, title, message, type) values (a.applicant_id, 'Application submitted', 'Your application was submitted successfully.', 'application');
  return a;
end; $$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.recruitment_cycles enable row level security;
alter table public.domains enable row level security;
alter table public.recruitment_questions enable row level security;
alter table public.applications enable row level security;
alter table public.application_domain_preferences enable row level security;
alter table public.application_answers enable row level security;
alter table public.recruitment_rounds enable row level security;
alter table public.interviews enable row level security;
alter table public.evaluations enable row level security;
alter table public.achievements enable row level security;
alter table public.projects enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles self read" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "roles self or staff read" on public.user_roles for select using (user_id = auth.uid() or public.is_admin());
create policy "roles super admin manage" on public.user_roles for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "cycles public active read" on public.recruitment_cycles for select using (status in ('upcoming','open','closed','completed') or public.is_staff());
create policy "cycles admin manage" on public.recruitment_cycles for all using (public.is_admin()) with check (public.is_admin());
create policy "domains public active read" on public.domains for select using (active or public.is_staff());
create policy "domains admin manage" on public.domains for all using (public.is_admin()) with check (public.is_admin());
create policy "questions active read" on public.recruitment_questions for select using (active or public.is_staff());
create policy "questions admin manage" on public.recruitment_questions for all using (public.is_admin()) with check (public.is_admin());
create policy "applications owner or staff read" on public.applications for select using (applicant_id = auth.uid() or public.is_staff());
create policy "applications owner draft create" on public.applications for insert with check (applicant_id = auth.uid() and status = 'draft');
create policy "applications owner draft update" on public.applications for update using (applicant_id = auth.uid() and status = 'draft') with check (applicant_id = auth.uid() and status = 'draft');
create policy "applications staff update" on public.applications for update using (public.is_staff()) with check (public.is_staff());
create policy "preferences owner or staff read" on public.application_domain_preferences for select using (exists (select 1 from public.applications a where a.id = application_id and (a.applicant_id = auth.uid() or public.is_staff())));
create policy "preferences owner draft write" on public.application_domain_preferences for all using (exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid() and a.status = 'draft')) with check (exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid() and a.status = 'draft'));
create policy "preferences staff manage" on public.application_domain_preferences for all using (public.is_staff()) with check (public.is_staff());
create policy "answers owner or staff read" on public.application_answers for select using (exists (select 1 from public.applications a where a.id = application_id and (a.applicant_id = auth.uid() or public.is_staff())));
create policy "answers owner draft write" on public.application_answers for all using (exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid() and a.status = 'draft')) with check (exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid() and a.status = 'draft'));
create policy "answers staff manage" on public.application_answers for all using (public.is_staff()) with check (public.is_staff());
create policy "rounds public active read" on public.recruitment_rounds for select using (active or public.is_staff());
create policy "rounds admin manage" on public.recruitment_rounds for all using (public.is_admin()) with check (public.is_admin());
create policy "interviews owner or staff read" on public.interviews for select using (public.is_staff() or exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid()));
create policy "interviews staff manage" on public.interviews for all using (public.is_staff()) with check (public.is_staff());
create policy "evaluations staff only" on public.evaluations for all using (public.is_staff()) with check (public.is_staff());
create policy "published achievements read" on public.achievements for select using (published or public.is_staff());
create policy "achievements admin manage" on public.achievements for all using (public.is_admin()) with check (public.is_admin());
create policy "published projects read" on public.projects for select using (published or public.is_staff());
create policy "projects admin manage" on public.projects for all using (public.is_admin()) with check (public.is_admin());
create policy "published announcements read" on public.announcements for select using ((published and (expires_at is null or expires_at > now())) or public.is_staff());
create policy "announcements admin manage" on public.announcements for all using (public.is_admin()) with check (public.is_admin());
create policy "notifications own read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications staff manage" on public.notifications for insert with check (public.is_staff());
create policy "audit staff read" on public.audit_logs for select using (public.is_admin());
create policy "audit staff insert" on public.audit_logs for insert with check (public.is_staff() and actor_id = auth.uid());

insert into storage.buckets (id, name, public) values ('private-applicant-files', 'private-applicant-files', false) on conflict (id) do nothing;
create policy "private files owner read" on storage.objects for select using (bucket_id = 'private-applicant-files' and (owner_id = auth.uid()::text or public.is_staff()));
create policy "private files owner upload" on storage.objects for insert with check (bucket_id = 'private-applicant-files' and owner_id = auth.uid()::text and (storage.foldername(name))[1] = auth.uid()::text);
create policy "private files owner update" on storage.objects for update using (bucket_id = 'private-applicant-files' and owner_id = auth.uid()::text) with check (bucket_id = 'private-applicant-files' and owner_id = auth.uid()::text);
create policy "private files owner delete" on storage.objects for delete using (bucket_id = 'private-applicant-files' and owner_id = auth.uid()::text);

-- One realistic open cycle and the UI's domain vocabulary; safe to re-run.
insert into public.domains (name, short_description, display_order) values
  ('Software', 'Application and robotics software.', 1), ('Electronics', 'Circuits, power and sensing.', 2), ('Mechanical', 'CAD, chassis and fabrication.', 3),
  ('Embedded', 'Firmware and real-time systems.', 4), ('Computer Vision', 'Perception and visual intelligence.', 5)
on conflict (name) do nothing;

insert into public.recruitment_cycles (name, academic_year, target_batch, description, application_open, application_close, status)
select 'FY & SY Recruitment 2026', '2026-27', 'FY/SY', 'PICT Robotics Club recruitment', '2026-09-15 00:00:00+00', '2026-09-30 23:59:59+00', 'open'
where not exists (select 1 from public.recruitment_cycles where academic_year = '2026-27' and target_batch = 'FY/SY');
