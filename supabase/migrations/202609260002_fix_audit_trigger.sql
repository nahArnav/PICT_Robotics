-- Fix record_audit_change trigger to avoid strict column checks on old/new records
create or replace function public.record_audit_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare row_id uuid; action_name text;
begin
  if TG_TABLE_NAME = 'applications' and TG_OP = 'UPDATE' and (row_to_json(old)->>'status') is not distinct from (row_to_json(new)->>'status') then
    return new;
  end if;
  if TG_TABLE_NAME = 'user_roles' and coalesce(row_to_json(new)->>'role', row_to_json(old)->>'role') = 'applicant' then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;
  
  if TG_OP = 'DELETE' then
    row_id := (row_to_json(old)->>'id')::uuid;
  else
    row_id := (row_to_json(new)->>'id')::uuid;
  end if;

  action_name := lower(TG_TABLE_NAME) || '_' || lower(TG_OP);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values (auth.uid(), action_name, TG_TABLE_NAME, row_id);
  
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;
