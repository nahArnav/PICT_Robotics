-- Hosted verification only: no application records or roles are changed.
begin read only;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$
begin
  if exists(select 1 from public.profiles) or exists(select 1 from public.applications)
    or exists(select 1 from public.evaluations) or exists(select 1 from public.application_notes)
    or exists(select 1 from public.interviews)
    or exists(select 1 from public.user_roles) or exists(select 1 from public.admin_invites)
  then raise exception 'Anonymous RLS isolation failed'; end if;
  if exists(select 1 from public.projects where not published)
    or exists(select 1 from public.achievements where not published)
    or exists(select 1 from public.gallery_items where not published)
  then raise exception 'Unpublished CMS content is visible anonymously'; end if;
  begin
    perform 1 from public.audit_logs;
    raise exception 'Retired activity archive unexpectedly exposed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.dashboard_metrics();
    raise exception 'Anonymous metrics RPC unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub',(
  select u.id::text from auth.users u join public.user_roles r on r.user_id=u.id
  where r.role='super_admin' and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=now()) order by u.id limit 1
),true);
set local role authenticated;
do $$
begin
  if public.current_role() is distinct from 'super_admin'::public.app_role then raise exception 'Existing super-admin role resolution failed'; end if;
  if not public.is_active_account() then raise exception 'Existing account is inactive'; end if;
  if (public.dashboard_metrics()->>'totalApplicants')::integer is null then raise exception 'Dashboard metrics are unavailable'; end if;
  if public.list_applications() is null then raise exception 'Applicant listing is unavailable'; end if;
  begin
    perform 1 from public.audit_logs;
    raise exception 'Retired activity archive unexpectedly exposed to staff';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
select 'Read-only hosted RLS and staff RPC checks passed; no application data changed.' as result;
