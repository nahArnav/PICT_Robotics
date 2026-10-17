-- Incremental completion of recruitment workflows. No production data is removed.

-- Restore a non-destructive Auth bootstrap. Metadata can never grant a role.
create or replace function public.create_applicant_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict(id) do nothing;
  insert into public.user_roles(user_id,role) values(new.id,'applicant') on conflict do nothing;
  return new;
end; $$;
insert into public.profiles(id,full_name,email)
select id,coalesce(raw_user_meta_data->>'full_name',''),email from auth.users u
where email is not null and not exists(select 1 from public.profiles p where p.id=u.id)
on conflict do nothing;
insert into public.user_roles(user_id,role)
select id,'applicant' from auth.users u where not exists(select 1 from public.user_roles r where r.user_id=u.id)
on conflict do nothing;

create or replace function public.can_review_application(p_application_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or (public.current_role()='recruiter' and exists(
    select 1 from public.application_reviewer_assignments where application_id=p_application_id and reviewer_id=auth.uid()
  ));
$$;

-- Recruiter visibility always depends on current roles, including after revocation.
drop policy if exists "profiles self or authorised reviewer read" on public.profiles;
create policy "profiles own or authorised staff" on public.profiles for select using(
  id=auth.uid() or public.is_admin() or exists(
    select 1 from public.applications a where a.applicant_id=profiles.id and public.can_review_application(a.id)
  )
);
drop policy if exists "questions active read" on public.recruitment_questions;
create policy "questions public cycle or application" on public.recruitment_questions for select using(
  public.is_admin() or exists(select 1 from public.recruitment_cycles c where c.id=recruitment_cycle_id and c.status<>'draft')
);
drop policy if exists "rounds public active read" on public.recruitment_rounds;
create policy "rounds visible cycle" on public.recruitment_rounds for select using(
  public.is_staff() or (active and exists(select 1 from public.recruitment_cycles c where c.id=recruitment_cycle_id and c.status<>'draft'))
);
drop policy if exists "published achievements read" on public.achievements;
create policy "published achievements read" on public.achievements for select using(published or public.is_admin());
drop policy if exists "published projects read" on public.projects;
create policy "published projects read" on public.projects for select using(published or public.is_admin());
drop policy if exists "published events are public" on public.club_events;
create policy "published events are public" on public.club_events for select using(status in ('published','completed') or public.is_admin());
drop policy if exists "published announcements read" on public.announcements;
create policy "published announcements read" on public.announcements for select using(
  public.is_admin() or (published and (published_at is null or published_at<=now()) and (expires_at is null or expires_at>now()))
);

alter table public.recruitment_cycles add column if not exists max_preferences integer not null default 3 check(max_preferences between 1 and 3);
alter table public.recruitment_rounds add column if not exists display_order integer not null default 0;
alter table public.achievements add column if not exists competition text;
alter table public.achievements add column if not exists rank text;
alter table public.achievements add column if not exists team text;
alter table public.achievements add column if not exists major boolean not null default false;
alter table public.projects add column if not exists slug text;
alter table public.projects add column if not exists tags text[] not null default '{}';
update public.projects set slug=id::text where slug is null;
create unique index if not exists projects_slug_unique on public.projects(slug);
alter table public.club_events add column if not exists display_order integer not null default 0;

create table public.application_notes(
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
 author_id uuid not null default auth.uid() references public.profiles(id), body text not null check(length(trim(body)) between 1 and 10000),
 created_at timestamptz not null default now()
);
alter table public.application_notes enable row level security;
create policy "notes assigned staff read" on public.application_notes for select using(public.can_review_application(application_id));
create policy "notes assigned staff create" on public.application_notes for insert with check(author_id=auth.uid() and public.can_review_application(application_id));

create table public.recruitment_tasks(
 id uuid primary key default gen_random_uuid(), recruitment_cycle_id uuid not null references public.recruitment_cycles(id),
 title text not null check(length(trim(title))>0), instructions text not null, deadline timestamptz not null,
 active boolean not null default false, created_at timestamptz not null default now()
);
create table public.task_submissions(
 id uuid primary key default gen_random_uuid(), task_id uuid not null references public.recruitment_tasks(id),
 application_id uuid not null references public.applications(id), repository_url text not null, demo_url text not null,
 notes text, submitted_at timestamptz not null default now(), unique(task_id,application_id)
);
alter table public.recruitment_tasks enable row level security;
alter table public.task_submissions enable row level security;
create policy "tasks published or admin" on public.recruitment_tasks for select using(public.is_admin() or (active and exists(
 select 1 from public.applications a where a.recruitment_cycle_id=recruitment_tasks.recruitment_cycle_id
 and (a.applicant_id=auth.uid() or public.can_review_application(a.id)) and a.status<>'draft'
)));
create policy "tasks admin manage" on public.recruitment_tasks for all using(public.is_admin()) with check(public.is_admin());
create policy "task submissions own or staff" on public.task_submissions for select using(exists(
 select 1 from public.applications a where a.id=application_id and (a.applicant_id=auth.uid() or public.can_review_application(a.id))
));

create or replace function public.valid_web_url(value text) returns boolean language sql immutable as $$
 select value is null or value='' or value ~* '^https?://[^[:space:]/]+[^[:space:]]*$';
$$;
create or replace function public.validate_web_fields() returns trigger language plpgsql as $$
declare item record;
begin
 for item in select key,value from jsonb_each_text(to_jsonb(new)) where key like '%\_url' escape '\' loop
   if not public.valid_web_url(item.value) then raise exception 'Please enter a complete http or https URL'; end if;
 end loop;
 return new;
end; $$;
create trigger profiles_urls before insert or update on public.profiles for each row execute function public.validate_web_fields();
create trigger applications_urls before insert or update on public.applications for each row execute function public.validate_web_fields();
create trigger projects_urls before insert or update on public.projects for each row execute function public.validate_web_fields();
create trigger achievements_urls before insert or update on public.achievements for each row execute function public.validate_web_fields();
create trigger events_urls before insert or update on public.club_events for each row execute function public.validate_web_fields();
create trigger interviews_urls before insert or update on public.interviews for each row execute function public.validate_web_fields();

-- Serialize all draft saves, submissions, task submissions and status changes per application.
-- Advisory locks also cover a first draft, for which no row exists yet.
create or replace function public.lock_application_write() returns trigger language plpgsql as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.applicant_id::text||new.recruitment_cycle_id::text,0));
 return new;
end; $$;
create trigger lock_application_write before insert or update on public.applications for each row execute function public.lock_application_write();

create or replace function public.validate_answer(p_question public.recruitment_questions, p_answer jsonb) returns boolean
language plpgsql immutable as $$
begin
 if p_answer is null or p_answer='null'::jsonb then return not p_question.required; end if;
 if p_question.question_type in ('short_text','long_text','url') then
   return jsonb_typeof(p_answer)='string' and (not p_question.required or length(trim(p_answer #>> '{}'))>0)
     and length(p_answer #>> '{}')<=20000 and (p_question.question_type<>'url' or public.valid_web_url(p_answer #>> '{}'));
 elsif p_question.question_type='number' then return jsonb_typeof(p_answer)='number';
 elsif p_question.question_type='single_choice' then return jsonb_typeof(p_answer)='string' and p_question.options @> jsonb_build_array(p_answer);
 elsif p_question.question_type='multi_choice' then
   if jsonb_typeof(p_answer)<>'array' then return false; end if;
   return (not p_question.required or jsonb_array_length(p_answer)>0) and p_question.options @> p_answer
     and jsonb_array_length(p_answer)=(select count(distinct value) from jsonb_array_elements(p_answer));
 end if;
 return false;
end; $$;

create or replace function public.save_application_draft(
 p_recruitment_cycle_id uuid,p_motivation text,p_experience_summary text,p_github_url text,p_portfolio_url text,p_domain_ids uuid[],p_answers jsonb default '[]'
) returns public.applications language plpgsql security definer set search_path=public as $$
declare a public.applications; c public.recruitment_cycles;
begin
 if auth.uid() is null or public.current_role() is distinct from 'applicant'::public.app_role then raise exception 'Only applicants may save applications'; end if;
 select * into c from public.recruitment_cycles where id=p_recruitment_cycle_id for share;
 if not found or c.status<>'open' or now()<c.application_open or now()>=c.application_close then raise exception 'This recruitment cycle is not accepting applications'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||c.id::text,0));
 select * into a from public.applications where applicant_id=auth.uid() and recruitment_cycle_id=c.id for update;
 if found and a.status<>'draft' then raise exception 'A submitted application cannot be edited'; end if;
 if coalesce(cardinality(p_domain_ids),0)>c.max_preferences or
   cardinality(p_domain_ids)<>(select count(distinct d) from unnest(p_domain_ids) d) or exists(
   select 1 from unnest(p_domain_ids) d where not exists(select 1 from public.domains where id=d and active)
 ) then raise exception 'Choose distinct active domains within the preference limit'; end if;
 if jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'Invalid answers'; end if;
 if exists(select 1 from jsonb_to_recordset(p_answers) x(question_id uuid,answer jsonb) left join public.recruitment_questions q on q.id=x.question_id
   where q.id is null or q.recruitment_cycle_id<>c.id or not q.active or (x.answer not in ('null'::jsonb,'""'::jsonb,'[]'::jsonb) and not public.validate_answer(q,x.answer))) then raise exception 'An answer is invalid for this question'; end if;
 insert into public.applications(applicant_id,recruitment_cycle_id,motivation,experience_summary,github_url,portfolio_url)
 values(auth.uid(),c.id,p_motivation,p_experience_summary,nullif(p_github_url,''),nullif(p_portfolio_url,''))
 on conflict(applicant_id,recruitment_cycle_id) do update set motivation=excluded.motivation,experience_summary=excluded.experience_summary,github_url=excluded.github_url,portfolio_url=excluded.portfolio_url
 returning * into a;
 delete from public.application_domain_preferences where application_id=a.id;
 insert into public.application_domain_preferences(application_id,domain_id,preference_order)
 select a.id,domain_id,position from unnest(p_domain_ids) with ordinality as preferences(domain_id,position);
 delete from public.application_answers where application_id=a.id;
 insert into public.application_answers(application_id,question_id,answer) select a.id,question_id,answer from jsonb_to_recordset(p_answers) x(question_id uuid,answer jsonb);
 return a;
end; $$;

create or replace function public.submit_application(p_application_id uuid) returns public.applications
language plpgsql security definer set search_path=public as $$
declare a public.applications; c public.recruitment_cycles;
begin
 if public.current_role() is distinct from 'applicant'::public.app_role then raise exception 'Only applicants may submit applications'; end if;
 select * into a from public.applications where id=p_application_id and applicant_id=auth.uid();
 if not found then raise exception 'Application not found'; end if;
 select * into c from public.recruitment_cycles where id=a.recruitment_cycle_id for share;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||c.id::text,0));
 select * into a from public.applications where id=p_application_id for update;
 if a.status<>'draft' then raise exception 'Only draft applications may be submitted'; end if;
 if c.status<>'open' or now()<c.application_open or now()>=c.application_close then raise exception 'This recruitment cycle is not accepting applications'; end if;
 if coalesce(trim(a.motivation),'')='' or not exists(select 1 from public.application_domain_preferences where application_id=a.id) then raise exception 'Complete the required application fields before submitting'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and length(trim(full_name))>0 and length(trim(phone))>0 and length(trim(branch))>0 and year is not null and length(trim(division))>0) then raise exception 'Complete your required profile details before submitting'; end if;
 if exists(select 1 from public.recruitment_questions q left join public.application_answers x on x.question_id=q.id and x.application_id=a.id
   where q.recruitment_cycle_id=c.id and q.active and (q.required or x.id is not null) and not public.validate_answer(q,x.answer)) then raise exception 'Answer every required recruitment question correctly before submitting'; end if;
 update public.applications set status='submitted',submitted_at=now() where id=a.id returning * into a;
 insert into public.notifications(user_id,title,message,type) values(auth.uid(),'Application submitted','Your application was submitted successfully.','application');
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'application_submitted','applications',a.id);
 return a;
end; $$;

create or replace function public.update_application_status(p_application_id uuid,p_status public.application_status) returns public.applications
language plpgsql security definer set search_path=public as $$
declare a public.applications; previous public.application_status;
begin
 if not public.can_review_application(p_application_id) then raise exception 'You do not have permission to update this application'; end if;
 select * into a from public.applications where id=p_application_id for update;
 if not found then raise exception 'Application not found'; end if;
 previous:=a.status;
 if not ((previous='submitted' and p_status in ('under_review','rejected')) or
 (previous='under_review' and p_status in ('shortlisted','rejected','waitlisted')) or
 (previous='shortlisted' and p_status in ('rejected','waitlisted')) or
 (previous='interview_scheduled' and p_status in ('selected','waitlisted','rejected')) or
 (previous='waitlisted' and p_status in ('shortlisted','selected','rejected'))) then raise exception 'This application status transition is not allowed'; end if;
 update public.applications set status=p_status,reviewed_at=now(),reviewed_by=auth.uid() where id=a.id returning * into a;
 insert into public.notifications(user_id,title,message,type) values(a.applicant_id,'Application status updated','Your application status is now '||replace(p_status::text,'_',' ')||'.','application_status');
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'application_status_updated','applications',a.id,jsonb_build_object('from',previous,'to',p_status));
 return a;
end; $$;

-- Applicant interviews expose schedule fields only. Internal notes never pass applicant RLS.
drop policy if exists "interviews applicant or assigned staff read" on public.interviews;
create policy "interviews assigned staff read" on public.interviews for select using(public.can_review_application(application_id));
create or replace function public.my_interviews() returns table(id uuid,application_id uuid,scheduled_at timestamptz,duration_minutes integer,location text,meeting_url text,status public.interview_status)
language sql stable security definer set search_path=public as $$
 select i.id,i.application_id,i.scheduled_at,i.duration_minutes,i.location,i.meeting_url,i.status
 from public.interviews i join public.applications a on a.id=i.application_id where a.applicant_id=auth.uid() order by i.scheduled_at;
$$;

-- Preserve historical records while serializing new bookings per interviewer and checking overlap.
create or replace function public.prevent_interview_overlap() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='scheduled' and new.interviewer_id is not null then
 perform pg_advisory_xact_lock(hashtextextended(new.interviewer_id::text,2));
 if exists(select 1 from public.interviews i where i.interviewer_id=new.interviewer_id and i.status='scheduled' and i.id<>new.id
 and tstzrange(i.scheduled_at,i.scheduled_at+make_interval(mins=>i.duration_minutes),'[)') && tstzrange(new.scheduled_at,new.scheduled_at+make_interval(mins=>new.duration_minutes),'[)')) then raise exception 'The selected interviewer is already booked for that time'; end if;
 end if;
 return new;
end; $$;
create or replace function public.schedule_interview(p_application_id uuid,p_scheduled_at timestamptz,p_interviewer_id uuid,p_duration integer default 20,p_location text default '',p_meeting_url text default null,p_interview_id uuid default null,p_status public.interview_status default 'scheduled',p_round_id uuid default null)
returns public.interviews language plpgsql security definer set search_path=public as $$
declare a public.applications; i public.interviews;
begin
 if not public.can_review_application(p_application_id) then raise exception 'You do not have permission to schedule this interview'; end if;
 select * into a from public.applications where id=p_application_id for update;
 if a.status not in ('shortlisted','interview_scheduled') then raise exception 'Shortlist the applicant before scheduling an interview'; end if;
 if p_status='scheduled' and (p_scheduled_at<=now() or p_interviewer_id is null or not exists(select 1 from public.user_roles where user_id=p_interviewer_id and role in ('recruiter','admin','super_admin'))) then raise exception 'Choose a future time and an authorised interviewer'; end if;
 if p_round_id is not null and not exists(select 1 from public.recruitment_rounds where id=p_round_id and recruitment_cycle_id=a.recruitment_cycle_id) then raise exception 'Round belongs to a different recruitment cycle'; end if;
 if p_interview_id is not null then
   update public.interviews set scheduled_at=p_scheduled_at,interviewer_id=p_interviewer_id,duration_minutes=p_duration,location=p_location,meeting_url=nullif(p_meeting_url,''),status=p_status,round_id=p_round_id
   where id=p_interview_id and application_id=a.id returning * into i;
   if not found then raise exception 'Interview not found'; end if;
 else
   insert into public.interviews(application_id,scheduled_at,interviewer_id,duration_minutes,location,meeting_url,round_id,status)
   values(a.id,p_scheduled_at,p_interviewer_id,p_duration,p_location,nullif(p_meeting_url,''),p_round_id,p_status) returning * into i;
 end if;
 if p_status='scheduled' then
 insert into public.application_reviewer_assignments(application_id,reviewer_id,assigned_by) values(a.id,p_interviewer_id,auth.uid()) on conflict do nothing;
 update public.applications set status='interview_scheduled' where id=a.id;
 end if;
 insert into public.notifications(user_id,title,message,type) values(a.applicant_id,'Interview updated',case when p_status='scheduled' then 'Your interview has been scheduled or rescheduled. Check your interview page.' else 'Your interview status is now '||p_status::text||'.' end,'interview');
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'interview_updated','interviews',i.id);
 return i;
end; $$;

alter table public.evaluations add column if not exists rubric_scores jsonb not null default '{}';
create policy "evaluations assigned create" on public.evaluations for insert with check(evaluator_id=auth.uid() and public.can_review_application(application_id));
create policy "evaluations assigned update" on public.evaluations for update using(evaluator_id=auth.uid() and public.can_review_application(application_id)) with check(evaluator_id=auth.uid() and public.can_review_application(application_id));
create or replace function public.guard_evaluation() returns trigger language plpgsql as $$
begin
 if TG_OP='UPDATE' and (new.application_id<>old.application_id or new.evaluator_id<>old.evaluator_id or new.round_id is distinct from old.round_id) then raise exception 'Evaluation ownership cannot change'; end if;
 if new.round_id is not null and not exists(select 1 from public.applications a join public.recruitment_rounds r on r.recruitment_cycle_id=a.recruitment_cycle_id where a.id=new.application_id and r.id=new.round_id) then raise exception 'Invalid evaluation round'; end if;
 if new.technical_score not between 0 and 10 or new.problem_solving_score not between 0 and 10 or new.communication_score not between 0 and 5 or new.teamwork_score not between 0 and 5 or new.overall_score not between 0 and 50 then raise exception 'Evaluation scores are outside the rubric range'; end if;
 return new;
end; $$;
create trigger evaluations_guard before insert or update on public.evaluations for each row execute function public.guard_evaluation();

create or replace function public.submit_task(p_task_id uuid,p_application_id uuid,p_repository_url text,p_demo_url text,p_notes text default '') returns public.task_submissions
language plpgsql security definer set search_path=public as $$
declare t public.recruitment_tasks; a public.applications; s public.task_submissions;
begin
 select * into t from public.recruitment_tasks where id=p_task_id and active for share;
 if not found or now()>=t.deadline then raise exception 'This task is closed'; end if;
 select * into a from public.applications where id=p_application_id and applicant_id=auth.uid() and recruitment_cycle_id=t.recruitment_cycle_id for update;
 if not found or a.status not in ('submitted','under_review','shortlisted','interview_scheduled') then raise exception 'Submit an eligible application first'; end if;
 if coalesce(p_repository_url,'')='' or coalesce(p_demo_url,'')='' or not public.valid_web_url(p_repository_url) or not public.valid_web_url(p_demo_url) then raise exception 'Enter valid repository and demo URLs'; end if;
 insert into public.task_submissions(task_id,application_id,repository_url,demo_url,notes) values(t.id,a.id,p_repository_url,p_demo_url,p_notes)
 on conflict(task_id,application_id) do update set repository_url=excluded.repository_url,demo_url=excluded.demo_url,notes=excluded.notes,submitted_at=now() returning * into s;
 return s;
end; $$;

-- Role management and invitation grants are validated against current backend roles.
create or replace function public.set_user_role(p_user_id uuid,p_role public.app_role) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_super_admin() then raise exception 'Super admin access required'; end if;
 perform pg_advisory_xact_lock(610170001);
 if p_user_id=auth.uid() and p_role<>'super_admin' then raise exception 'Ask another super admin to change your own role'; end if;
 delete from public.user_roles where user_id=p_user_id;
 insert into public.user_roles(user_id,role) values(p_user_id,p_role);
end; $$;

create or replace function public.create_admin_invite(p_email text,p_role public.app_role,p_expires_at timestamptz default now()+interval '7 days')
returns table(id uuid,token uuid,expires_at timestamptz) language plpgsql security definer set search_path=public,extensions as $$
declare secret uuid:=gen_random_uuid(); r public.app_role:=public.current_role();
begin
 if auth.uid() is null or r is null or r not in ('admin','super_admin') then raise exception 'You do not have permission to create admin invitations'; end if;
 if p_role is null or p_role not in ('recruiter','admin','super_admin') or (r='admin' and p_role<>'recruiter') then raise exception 'You do not have permission to grant this role'; end if;
 if p_email is null or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'A valid invitee email is required'; end if;
 if p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'Invalid invitation expiry'; end if;
 insert into public.admin_invites(email,role,token,token_hash,created_by,expires_at)
 values(lower(trim(p_email)),p_role,null,encode(digest(secret::text,'sha256'),'hex'),auth.uid(),p_expires_at)
 returning admin_invites.id,admin_invites.expires_at into id,expires_at;
 token:=secret;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'admin_invite_created','admin_invites',id,jsonb_build_object('role',p_role));
 return next;
end; $$;
create or replace function public.accept_admin_invite(p_token uuid) returns public.app_role language plpgsql security definer set search_path=public,extensions as $$
declare i public.admin_invites; r public.app_role; account_email text;
begin
 if auth.uid() is null then raise exception 'Sign in before accepting an invitation'; end if;
 select * into i from public.admin_invites where token_hash=encode(digest(p_token::text,'sha256'),'hex') and accepted_at is null and revoked_at is null and expires_at>now() for update;
 if not found then raise exception 'This invitation is invalid, expired, revoked, or already used'; end if;
 select email into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if account_email is null then raise exception 'Verify your email address before accepting this invitation'; end if;
 if lower(i.email)<>lower(account_email) then raise exception 'This invitation belongs to a different email address'; end if;
 select role into r from public.user_roles where user_id=i.created_by order by case role when 'super_admin' then 0 when 'admin' then 1 else 2 end limit 1;
 if r is null or (r<>'super_admin' and not(r='admin' and i.role='recruiter')) then raise exception 'The inviter no longer has permission to grant this role'; end if;
 delete from public.user_roles where user_id=auth.uid() and role='applicant';
 insert into public.user_roles(user_id,role) values(auth.uid(),i.role) on conflict do nothing;
 update public.admin_invites set accepted_at=now(),accepted_by=auth.uid() where id=i.id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'admin_invite_accepted','admin_invites',i.id);
 return i.role;
end; $$;

create or replace function public.send_member_notifications(p_user_ids uuid[],p_title text,p_message text,p_request_id uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare count_sent integer;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if cardinality(p_user_ids) not between 1 and 200 or length(trim(p_title)) not between 1 and 200 or length(trim(p_message)) not between 1 and 10000 or p_request_id is null then raise exception 'Invalid message or recipient count'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,1));
 if exists(select 1 from public.audit_logs where entity_id=p_request_id and action='member_notifications_sent') then return 0; end if;
 insert into public.notifications(user_id,title,message,type) select id,p_title,p_message,'admin_mail' from public.profiles where id=any(p_user_ids);
 get diagnostics count_sent=row_count;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'member_notifications_sent','notifications',p_request_id,jsonb_build_object('count',count_sent));
 return count_sent;
end; $$;

-- Stable JSON RPCs avoid ambiguous profile foreign keys and aggregate on the server.
create or replace function public.list_applications(p_search text default '',p_status text default 'all',p_year text default 'all',p_branch text default 'all',p_domain text default 'all',p_cycle_id uuid default null,p_page integer default 1,p_page_size integer default 50) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.is_staff() then raise exception 'Staff access required'; end if;
 with filtered as (
 select a.*,to_jsonb(p) as profile,coalesce((select jsonb_agg(jsonb_build_object('domain_id',d.domain_id,'preference_order',d.preference_order,'domain',jsonb_build_object('name',dom.name)) order by d.preference_order) from public.application_domain_preferences d join public.domains dom on dom.id=d.domain_id where d.application_id=a.id),'[]'::jsonb) domain_preferences
 from public.applications a join public.profiles p on p.id=a.applicant_id
 where a.status<>'draft' and public.can_review_application(a.id) and (p_cycle_id is null or a.recruitment_cycle_id=p_cycle_id)
 and (p_search='' or p.full_name ilike '%'||p_search||'%' or p.email ilike '%'||p_search||'%')
 and (p_status='all' or a.status::text=p_status) and (p_year='all' or p.year=p_year) and(p_branch='all' or p.branch=p_branch)
 and(p_domain='all' or exists(select 1 from public.application_domain_preferences d join public.domains dom on dom.id=d.domain_id where d.application_id=a.id and dom.name=p_domain))
 ), page as (select * from filtered order by submitted_at desc nulls last,id limit least(greatest(p_page_size,1),100) offset (greatest(p_page,1)-1)*least(greatest(p_page_size,1),100))
 select jsonb_build_object('total',(select count(*) from filtered),'applicants',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb)) into result;
 return result;
end; $$;
create or replace function public.dashboard_metrics(p_cycle_id uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.is_staff() then raise exception 'Staff access required'; end if;
 with apps as(select a.*,p.branch,p.year from public.applications a join public.profiles p on p.id=a.applicant_id where status<>'draft' and public.can_review_application(a.id) and (p_cycle_id is null or recruitment_cycle_id=p_cycle_id))
 select jsonb_build_object('totalApplicants',count(*),'submitted',count(*) filter(where status='submitted'),'underReview',count(*) filter(where status='under_review'),'shortlisted',count(*) filter(where status='shortlisted'),'interviewScheduled',count(*) filter(where status='interview_scheduled'),'selected',count(*) filter(where status='selected'),'rejected',count(*) filter(where status='rejected'),
 'byYear',jsonb_build_object('fy',count(*) filter(where year='FY'),'sy',count(*) filter(where year='SY')),
 'byBranch',coalesce((select jsonb_agg(x) from(select coalesce(branch,'Other') label,count(*) value from apps group by branch)x),'[]'::jsonb),
 'byDomain',coalesce((select jsonb_agg(x) from(select d.name label,count(*) value from apps a join public.application_domain_preferences p on p.application_id=a.id and p.preference_order=1 join public.domains d on d.id=p.domain_id group by d.name)x),'[]'::jsonb),
 'byStatus',coalesce((select jsonb_agg(x) from(select status,count(*) count from apps group by status)x),'[]'::jsonb)) into result from apps;
 return result;
end; $$;

create or replace function public.staff_directory() returns table(id uuid,full_name text,email text,role public.app_role)
language sql stable security definer set search_path=public as $$
 select p.id,p.full_name,p.email,r.role from public.profiles p
 join lateral(select role from public.user_roles where user_id=p.id and role<>'applicant' order by case role when 'super_admin' then 0 when 'admin' then 1 else 2 end limit 1) r on true
 where public.is_staff() order by p.full_name;
$$;
revoke all on function public.staff_directory() from public,anon;
grant execute on function public.staff_directory() to authenticated;

-- Server-controlled audit for all sensitive direct writes.
create trigger audit_notes after insert on public.application_notes for each row execute function public.record_audit_change();
create trigger audit_tasks after insert or update or delete on public.recruitment_tasks for each row execute function public.record_audit_change();
create trigger audit_evaluations after insert or update or delete on public.evaluations for each row execute function public.record_audit_change();
create trigger audit_assignments after insert or update or delete on public.application_reviewer_assignments for each row execute function public.record_audit_change();
create trigger audit_rounds after insert or update or delete on public.recruitment_rounds for each row execute function public.record_audit_change();
create trigger audit_questions after insert or update or delete on public.recruitment_questions for each row execute function public.record_audit_change();
create trigger achievements_touch before update on public.achievements for each row execute function public.touch_updated_at();
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();
create trigger announcements_touch before update on public.announcements for each row execute function public.touch_updated_at();

-- Media: random unique paths under the owner ID, private documents readable by authorised admins only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('club-media','club-media',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "club media read" on storage.objects for select using(bucket_id='club-media');
create policy "club media upload" on storage.objects for insert with check(bucket_id='club-media' and public.is_admin() and (storage.foldername(name))[1]=auth.uid()::text);
create policy "club media admin delete" on storage.objects for delete using(bucket_id='club-media' and public.is_admin());
drop policy if exists "private files owner read" on storage.objects;
drop policy if exists "private files owner upload" on storage.objects;
drop policy if exists "private files owner update" on storage.objects;
drop policy if exists "private files owner delete" on storage.objects;
create policy "private files owner read" on storage.objects for select using(bucket_id='private-applicant-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy "private files owner upload" on storage.objects for insert with check(bucket_id='private-applicant-files' and owner_id::text=auth.uid()::text and (storage.foldername(name))[1]=auth.uid()::text);
create policy "private files owner delete" on storage.objects for delete using(bucket_id='private-applicant-files' and owner_id::text=auth.uid()::text and (storage.foldername(name))[1]=auth.uid()::text);
update storage.buckets set file_size_limit=5242880,allowed_mime_types=array['application/pdf','image/jpeg','image/png'] where id='private-applicant-files';

-- Default PostgreSQL PUBLIC execute is never relied upon for privileged RPCs.
revoke all on function public.my_interviews(),public.schedule_interview(uuid,timestamptz,uuid,integer,text,text,uuid,public.interview_status,uuid),public.set_user_role(uuid,public.app_role),public.submit_task(uuid,uuid,text,text,text),public.send_member_notifications(uuid[],text,text,uuid),public.list_applications(text,text,text,text,text,uuid,integer,integer),public.dashboard_metrics(uuid) from public,anon;
grant execute on function public.my_interviews(),public.schedule_interview(uuid,timestamptz,uuid,integer,text,text,uuid,public.interview_status,uuid),public.set_user_role(uuid,public.app_role),public.submit_task(uuid,uuid,text,text,text),public.send_member_notifications(uuid[],text,text,uuid),public.list_applications(text,text,text,text,text,uuid,integer,integer),public.dashboard_metrics(uuid) to authenticated;
grant select,insert,update,delete on public.application_notes,public.recruitment_tasks,public.task_submissions to authenticated;
