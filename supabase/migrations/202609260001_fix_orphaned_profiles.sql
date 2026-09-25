-- Fix for "Database error saving new user" when orphaned profiles exist
create or replace function public.create_applicant_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into public.profiles (id, full_name, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
    on conflict (id) do nothing;
  exception when unique_violation then
    -- An orphaned profile with the same email exists. Since GoTrue enforces unique emails in auth.users,
    -- this profile must belong to a previously deleted user. Clean it up and retry.
    delete from public.profiles where email = new.email;
    
    insert into public.profiles (id, full_name, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
    on conflict (id) do nothing;
  end;

  insert into public.user_roles (user_id, role)
  values (new.id, 'applicant')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;
