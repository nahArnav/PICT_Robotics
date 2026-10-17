-- Close final submission/configuration gaps without changing historical records.
create or replace function public.validate_answer(p_question public.recruitment_questions, p_answer jsonb) returns boolean
language plpgsql immutable as $$
begin
 if p_answer is null or p_answer='null'::jsonb
   or p_answer='[]'::jsonb or (jsonb_typeof(p_answer)='string' and length(trim(p_answer #>> '{}'))=0)
 then return not p_question.required; end if;
 if p_question.question_type in ('short_text','long_text','url') then
   return jsonb_typeof(p_answer)='string' and length(p_answer #>> '{}')<=20000
     and (p_question.question_type<>'url' or public.valid_web_url(p_answer #>> '{}'));
 elsif p_question.question_type='number' then return jsonb_typeof(p_answer)='number';
 elsif p_question.question_type='single_choice' then return jsonb_typeof(p_answer)='string' and p_question.options @> jsonb_build_array(p_answer);
 elsif p_question.question_type='multi_choice' then
   if jsonb_typeof(p_answer)<>'array' then return false; end if;
   return p_question.options @> p_answer
     and jsonb_array_length(p_answer)=(select count(distinct value) from jsonb_array_elements(p_answer));
 end if;
 return false;
end; $$;

-- Auth bans/deletions must take effect even while an old access JWT is unexpired.
-- The Auth API still owns account management; no browser may write auth.users.
create function public.is_active_account() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from auth.users where id=auth.uid() and deleted_at is null
   and (banned_until is null or banned_until<=now()));
$$;
revoke all on function public.is_active_account() from public,anon;
grant execute on function public.is_active_account() to authenticated;

create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path=public as $$
 select role from public.user_roles where user_id=auth.uid() and public.is_active_account()
 order by case role when 'super_admin' then 1 when 'admin' then 2 when 'recruiter' then 3 else 4 end limit 1;
$$;

do $$
declare target text;
begin
 foreach target in array array[
   'profiles','user_roles','recruitment_cycles','domains','recruitment_questions',
   'applications','application_domain_preferences','application_answers','recruitment_rounds',
   'interviews','evaluations','achievements','projects','club_events','announcements',
   'notifications','admin_invites','audit_logs','application_reviewer_assignments',
   'application_notes','recruitment_tasks','task_submissions','club_team_entries',
   'gallery_items','homepage_metrics'
 ] loop
   execute format('create policy "active account required" on public.%I as restrictive for all to authenticated using ((select public.is_active_account())) with check ((select public.is_active_account()))',target);
 end loop;
end; $$;
-- Do not change permissions for unrelated storage buckets on an existing project.
create policy "active account for club storage" on storage.objects as restrictive for all to authenticated
 using(bucket_id not in ('club-media','private-applicant-files') or (select public.is_active_account()))
 with check(bucket_id not in ('club-media','private-applicant-files') or (select public.is_active_account()));

create or replace function public.submit_application(p_application_id uuid) returns public.applications
language plpgsql security definer set search_path=public as $$
declare a public.applications; c public.recruitment_cycles; preference_count integer;
begin
 if public.current_role() is distinct from 'applicant'::public.app_role then raise exception 'Only applicants may submit applications'; end if;
 select * into a from public.applications where id=p_application_id and applicant_id=auth.uid();
 if not found then raise exception 'Application not found'; end if;
 select * into c from public.recruitment_cycles where id=a.recruitment_cycle_id for share;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||c.id::text,0));
 select * into a from public.applications where id=p_application_id for update;
 if a.status<>'draft' then raise exception 'Only draft applications may be submitted'; end if;
 if c.status<>'open' or now()<c.application_open or now()>=c.application_close then raise exception 'This recruitment cycle is not accepting applications'; end if;
 select count(*) into preference_count from public.application_domain_preferences where application_id=a.id;
 if coalesce(trim(a.motivation),'')='' or preference_count=0 then raise exception 'Complete the required application fields before submitting'; end if;
 if preference_count>c.max_preferences or exists(
   select 1 from public.application_domain_preferences p join public.domains d on d.id=p.domain_id
   where p.application_id=a.id and not d.active
 ) then raise exception 'Your domain preferences changed. Choose active domains within the campaign limit and save again.'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and length(trim(full_name))>0 and length(trim(phone))>0 and length(trim(branch))>0 and year is not null and length(trim(division))>0) then raise exception 'Complete your required profile details before submitting'; end if;
 if exists(select 1 from public.recruitment_questions q left join public.application_answers x on x.question_id=q.id and x.application_id=a.id
   where q.recruitment_cycle_id=c.id and q.active and (q.required or x.id is not null) and not public.validate_answer(q,x.answer)) then raise exception 'Answer every required recruitment question correctly before submitting'; end if;
 update public.applications set status='submitted',submitted_at=now() where id=a.id returning * into a;
 insert into public.notifications(user_id,title,message,type) values(auth.uid(),'Application submitted','Your application was submitted successfully.','application');
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'application_submitted','applications',a.id);
 return a;
end; $$;

create or replace function public.my_interviews() returns table(id uuid,application_id uuid,scheduled_at timestamptz,duration_minutes integer,location text,meeting_url text,status public.interview_status)
language sql stable security definer set search_path=public as $$
 select i.id,i.application_id,i.scheduled_at,i.duration_minutes,i.location,i.meeting_url,i.status
 from public.interviews i join public.applications a on a.id=i.application_id
 where a.applicant_id=auth.uid() and public.is_active_account() order by i.scheduled_at;
$$;

create or replace function public.submit_task(p_task_id uuid,p_application_id uuid,p_repository_url text,p_demo_url text,p_notes text default '') returns public.task_submissions
language plpgsql security definer set search_path=public as $$
declare t public.recruitment_tasks; a public.applications; s public.task_submissions;
begin
 if public.current_role() is distinct from 'applicant'::public.app_role then raise exception 'Applicant access required'; end if;
 select * into t from public.recruitment_tasks where id=p_task_id and active for share;
 if not found or now()>=t.deadline then raise exception 'This task is closed'; end if;
 select * into a from public.applications where id=p_application_id and applicant_id=auth.uid() and recruitment_cycle_id=t.recruitment_cycle_id for update;
 if not found or a.status not in ('submitted','under_review','shortlisted','interview_scheduled') then raise exception 'Submit an eligible application first'; end if;
 if coalesce(p_repository_url,'')='' or coalesce(p_demo_url,'')='' or not public.valid_web_url(p_repository_url) or not public.valid_web_url(p_demo_url) then raise exception 'Enter valid repository and demo URLs'; end if;
 insert into public.task_submissions(task_id,application_id,repository_url,demo_url,notes) values(t.id,a.id,p_repository_url,p_demo_url,p_notes)
 on conflict(task_id,application_id) do update set repository_url=excluded.repository_url,demo_url=excluded.demo_url,notes=excluded.notes,submitted_at=now() returning * into s;
 return s;
end; $$;

-- Serialize invite acceptance with role changes, then recheck the inviter's authority.
create or replace function public.accept_admin_invite(p_token uuid) returns public.app_role
language plpgsql security definer set search_path=public,extensions as $$
declare i public.admin_invites; r public.app_role; account_email text;
begin
 if not public.is_active_account() then raise exception 'Sign in with an active account before accepting an invitation'; end if;
 perform pg_advisory_xact_lock(610170001);
 select * into i from public.admin_invites where token_hash=encode(digest(p_token::text,'sha256'),'hex') and accepted_at is null and revoked_at is null and expires_at>now() for update;
 if not found then raise exception 'This invitation is invalid, expired, revoked, or already used'; end if;
 select email into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if account_email is null then raise exception 'Verify your email address before accepting this invitation'; end if;
 if lower(i.email)<>lower(account_email) then raise exception 'This invitation belongs to a different email address'; end if;
 select role into r from public.user_roles where user_id=i.created_by
   and exists(select 1 from auth.users where id=i.created_by and deleted_at is null and (banned_until is null or banned_until<=now()))
   order by case role when 'super_admin' then 0 when 'admin' then 1 else 2 end limit 1;
 if r is null or (r<>'super_admin' and not(r='admin' and i.role='recruiter')) then raise exception 'The inviter no longer has permission to grant this role'; end if;
 delete from public.user_roles where user_id=auth.uid() and role='applicant';
 insert into public.user_roles(user_id,role) values(auth.uid(),i.role) on conflict do nothing;
 update public.admin_invites set accepted_at=now(),accepted_by=auth.uid() where id=i.id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'admin_invite_accepted','admin_invites',i.id);
 return i.role;
end; $$;
