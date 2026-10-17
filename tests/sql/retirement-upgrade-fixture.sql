-- Disposable upgrade fixture: preserve an old notification request and pending invite.
insert into auth.users(id,email,email_confirmed_at)
 values('88888888-0000-4000-8000-000000000001','upgrade-owner@test.local',now());
update public.user_roles set role='super_admin' where user_id='88888888-0000-4000-8000-000000000001';
insert into public.admin_invites(id,email,role,created_by,token,token_hash)
 values('88888888-0000-4000-8000-000000000002','retired-invite@test.local','recruiter',
 '88888888-0000-4000-8000-000000000001',null,encode(extensions.digest('88888888-0000-4000-8000-000000000003','sha256'),'hex'));
insert into public.audit_logs(id,action,entity_type,entity_id)
 values('88888888-0000-4000-8000-000000000004','member_notifications_sent','notifications','88888888-0000-4000-8000-000000000005');
create table public.test_retirement_snapshot as select count(*) as retained_count from public.audit_logs;
revoke all on public.test_retirement_snapshot from anon,authenticated;
