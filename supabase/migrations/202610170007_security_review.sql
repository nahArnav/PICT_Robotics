-- Recheck the actor after acquiring the role-management lock. Two concurrent requests
-- must never demote each other and remove every super admin.
create or replace function public.set_user_role(p_user_id uuid,p_role public.app_role) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(610170001);
 if not public.is_super_admin() then raise exception 'Super admin access required'; end if;
 if p_user_id=auth.uid() and p_role<>'super_admin' then raise exception 'Ask another super admin to change your own role'; end if;
 delete from public.user_roles where user_id=p_user_id;
 insert into public.user_roles(user_id,role) values(p_user_id,p_role);
end; $$;

create or replace function public.record_audit_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare previous jsonb; current_record jsonb; entity uuid;
begin
 if TG_OP<>'INSERT' then previous:=to_jsonb(old); end if;
 if TG_OP<>'DELETE' then current_record:=to_jsonb(new); end if;
 if TG_TABLE_NAME='applications' and TG_OP='UPDATE' and previous->>'status' is not distinct from current_record->>'status' then return new; end if;
 if TG_TABLE_NAME='user_roles' and coalesce(current_record->>'role',previous->>'role')='applicant' then
   if TG_OP='DELETE' then return old; else return new; end if;
 end if;
 entity:=coalesce(current_record->>'id',previous->>'id')::uuid;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),lower(TG_TABLE_NAME)||'_'||lower(TG_OP),TG_TABLE_NAME,entity,jsonb_strip_nulls(jsonb_build_object(
 'previous_role',previous->'role','new_role',current_record->'role','user_id',coalesce(current_record->'user_id',previous->'user_id'),
 'previous_status',previous->'status','new_status',current_record->'status','published',current_record->'published'
 )));
 if TG_OP='DELETE' then return old; else return new; end if;
end; $$;

-- Validate administrator-authored question configuration before it can block applicants.
create or replace function public.guard_question_configuration() returns trigger language plpgsql as $$
begin
 if length(trim(new.question))=0 or jsonb_typeof(new.options) is distinct from 'array' then raise exception 'A question and a JSON array of options are required'; end if;
 if new.question_type in ('single_choice','multi_choice') and (jsonb_array_length(new.options)=0 or exists(select 1 from jsonb_array_elements(new.options) option where jsonb_typeof(option)<>'string') or jsonb_array_length(new.options)<>(select count(distinct option) from jsonb_array_elements(new.options) option)) then raise exception 'Choice questions require distinct text options'; end if;
 return new;
end; $$;
create trigger question_configuration_guard before insert or update on public.recruitment_questions for each row execute function public.guard_question_configuration();

alter table public.projects add constraint projects_safe_slug check(slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') not valid;
create index if not exists interviews_round_idx on public.interviews(round_id);
create index if not exists evaluations_application_idx on public.evaluations(application_id);
create index if not exists answers_question_idx on public.application_answers(question_id);
create index if not exists task_submissions_application_idx on public.task_submissions(application_id);
create index if not exists application_notes_application_idx on public.application_notes(application_id,created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
