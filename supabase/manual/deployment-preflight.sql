-- Read-only, aggregate production preflight. Deliberately excludes applicant PII.
select jsonb_build_object(
  'migration_versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
  'active_verified_super_admins',(select count(distinct u.id) from auth.users u join public.user_roles r on r.user_id=u.id
    where r.role='super_admin' and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())),
  'counts',jsonb_build_object('profiles',(select count(*) from public.profiles),'applications',(select count(*) from public.applications),
    'cycles',(select count(*) from public.recruitment_cycles),'achievements',(select count(*) from public.achievements),
    'projects',(select count(*) from public.projects),'events',(select count(*) from public.club_events),
    'invitations',(select count(*) from public.admin_invites)),
  'missing_profiles',(select count(*) from auth.users u left join public.profiles p on p.id=u.id where u.email is not null and p.id is null),
  'profile_email_mismatches',(select count(*) from public.profiles p join auth.users u on u.id=p.id where lower(p.email)<>lower(u.email)),
  'existing_completion_tables',(select coalesce(jsonb_agg(tablename),'[]'::jsonb) from pg_tables where schemaname='public' and tablename in('application_notes','recruitment_tasks','task_submissions','club_team_entries','gallery_items','homepage_metrics')),
  'public_tables_without_rls',(select coalesce(jsonb_agg(tablename),'[]'::jsonb) from pg_tables where schemaname='public' and not rowsecurity)
) as preflight;
