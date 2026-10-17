-- A role revocation must also revoke access to the evaluator's historical private data.
drop policy if exists "evaluations evaluator or admin read" on public.evaluations;
create policy "evaluations authorised evaluator or admin" on public.evaluations for select using(
 public.is_admin() or (evaluator_id=auth.uid() and public.can_review_application(application_id))
);

-- Trusted RPCs already lock application rows. A second trigger-level advisory lock would
-- reverse the locking order used by draft saves and introduce unnecessary deadlocks.
drop trigger if exists lock_application_write on public.applications;

create or replace function public.guard_evaluation() returns trigger language plpgsql as $$
declare score jsonb; position integer:=0; maximum integer; total numeric:=0;
begin
 if TG_OP='UPDATE' and (new.application_id<>old.application_id or new.evaluator_id<>old.evaluator_id or new.round_id is distinct from old.round_id) then raise exception 'Evaluation ownership cannot change'; end if;
 if new.round_id is not null and not exists(select 1 from public.applications a join public.recruitment_rounds r on r.recruitment_cycle_id=a.recruitment_cycle_id where a.id=new.application_id and r.id=new.round_id) then raise exception 'Invalid evaluation round'; end if;
 if new.rubric_scores <> '{}'::jsonb then
   if jsonb_typeof(new.rubric_scores)<>'array' or jsonb_array_length(new.rubric_scores)<>6 then raise exception 'Complete all six evaluation criteria'; end if;
   for score in select value from jsonb_array_elements(new.rubric_scores) loop
     maximum:=case when position<4 then 10 else 5 end;
     if jsonb_typeof(score)<>'number' or (score::text)::numeric<0 or (score::text)::numeric>maximum or (score::text)::numeric<>trunc((score::text)::numeric) then raise exception 'Evaluation scores are outside the rubric range'; end if;
     total:=total+(score::text)::numeric;position:=position+1;
   end loop;
   new.overall_score:=total;
   new.technical_score:=(new.rubric_scores->>0)::numeric;
   new.problem_solving_score:=(new.rubric_scores->>1)::numeric;
   new.communication_score:=(new.rubric_scores->>4)::numeric;
   new.teamwork_score:=(new.rubric_scores->>5)::numeric;
 end if;
 if new.technical_score not between 0 and 10 or new.problem_solving_score not between 0 and 10 or new.communication_score not between 0 and 5 or new.teamwork_score not between 0 and 5 or new.overall_score not between 0 and 50 then raise exception 'Evaluation scores are outside the rubric range'; end if;
 if TG_OP='INSERT' then
   perform pg_advisory_xact_lock(hashtextextended(new.application_id::text||new.evaluator_id::text||coalesce(new.round_id::text,''),4));
   if exists(select 1 from public.evaluations where application_id=new.application_id and evaluator_id=new.evaluator_id and round_id is not distinct from new.round_id) then raise exception 'You have already evaluated this applicant in this round. Update your evaluation instead.'; end if;
 end if;
 return new;
end; $$;

-- Notifications get their read timestamp from the database clock.
create or replace function public.guard_notification_update() returns trigger language plpgsql as $$
begin
 if new.id is distinct from old.id or new.user_id is distinct from old.user_id or new.title is distinct from old.title or new.message is distinct from old.message or new.type is distinct from old.type or new.created_at is distinct from old.created_at then raise exception 'Only notification read state may be changed'; end if;
 new.read_at:=case when new.read then coalesce(old.read_at,now()) else null end;
 return new;
end; $$;

-- Prevent assignments to non-staff accounts and lock author attribution to the caller.
create or replace function public.guard_reviewer_assignment() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.user_roles where user_id=new.reviewer_id and role in ('recruiter','admin','super_admin')) then raise exception 'Choose an authorised reviewer'; end if;
 if auth.uid() is not null then new.assigned_by:=auth.uid(); end if;
 return new;
end; $$;
create trigger reviewer_assignment_guard before insert or update on public.application_reviewer_assignments for each row execute function public.guard_reviewer_assignment();

-- Disallow deleting a cycle/question used by historical applications through cascade.
-- Existing FK relationships and records remain in place.
create or replace function public.guard_recruitment_history() returns trigger language plpgsql as $$
begin
 if TG_TABLE_NAME='recruitment_cycles' and exists(select 1 from public.applications where recruitment_cycle_id=old.id) then raise exception 'This campaign has applications. Archive it instead of deleting it.'; end if;
 if TG_TABLE_NAME='recruitment_questions' and exists(select 1 from public.application_answers where question_id=old.id) then raise exception 'This question has answers. Disable it instead of deleting it.'; end if;
 return old;
end; $$;
create trigger protect_cycle_history before delete on public.recruitment_cycles for each row execute function public.guard_recruitment_history();
create trigger protect_question_history before delete on public.recruitment_questions for each row execute function public.guard_recruitment_history();
