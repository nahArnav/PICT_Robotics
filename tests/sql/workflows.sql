create function public.test_assert(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end; $$;
create function public.test_denied(command text,label text) returns void language plpgsql as $$
begin
 begin execute command;
 exception when sqlstate 'P0001' or insufficient_privilege or check_violation or foreign_key_violation or unique_violation then
   raise notice 'PASS: % (%)',label,sqlerrm; return;
 end;
 raise exception 'FAIL: unexpected success: %',label;
end; $$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001','one@test.local',now(),'{"full_name":"Applicant One","role":"super_admin"}'),
 ('00000000-0000-0000-0000-000000000002','two@test.local',now(),'{"full_name":"Applicant Two"}'),
 ('00000000-0000-0000-0000-000000000003','review-admin@test.local',now(),'{}'),
 ('00000000-0000-0000-0000-000000000004','admin@test.local',now(),'{}'),
 ('00000000-0000-0000-0000-000000000005','super@test.local',now(),'{}'),
 ('00000000-0000-0000-0000-000000000006','invite@test.local',now(),'{}');
update public.user_roles set role='admin' where user_id='00000000-0000-0000-0000-000000000003';
update public.user_roles set role='admin' where user_id='00000000-0000-0000-0000-000000000004';
update public.user_roles set role='super_admin' where user_id='00000000-0000-0000-0000-000000000005';
insert into public.recruitment_cycles(id,name,academic_year,target_batch,application_open,application_close,status)
values('10000000-0000-0000-0000-000000000001','Test cycle','test','FY/SY',now()-interval '1 day',now()+interval '1 day','open');
insert into public.recruitment_questions(id,recruitment_cycle_id,question,question_type,required)
values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Required?','long_text',true);

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.test_assert(public.current_role()='applicant','signup metadata cannot grant admin');
select public.test_assert((select count(*)=1 from public.profiles),'applicant sees own profile only');
select public.test_denied($$insert into public.user_roles(user_id,role) values(auth.uid(),'admin')$$,'self role escalation denied');
select public.test_denied($$update public.profiles set id='00000000-0000-0000-0000-000000000002' where id=auth.uid()$$,'profile impersonation denied');
select public.test_denied($$update public.profiles set email='hijack@test.local' where id=auth.uid()$$,'profile email must use Auth');
update public.profiles set phone='12345',branch='IT',year='FY',division='A' where id=auth.uid();
select public.test_denied($$select public.create_admin_invite('intruder@test.local','admin')$$,'applicant invite endpoint denied');
select public.test_denied($$select public.dashboard_metrics()$$,'applicant analytics endpoint denied');
select public.test_denied($$insert into public.audit_logs(actor_id,action,entity_type) values(auth.uid(),'forged','test')$$,'audit forgery denied');
select public.test_denied($$select public.save_application_draft('10000000-0000-0000-0000-000000000001','motivation','','','',array[(select id from public.domains limit 1),(select id from public.domains limit 1)])$$,'duplicate preferences rejected');
select id as app_id from public.save_application_draft('10000000-0000-0000-0000-000000000001','I build robots','','','',array[(select id from public.domains limit 1)]) \gset
select public.test_denied(format('select public.submit_application(%L)', :'app_id'),'missing required answer rejected');
select public.save_application_draft('10000000-0000-0000-0000-000000000001','I build robots','','','',array[(select id from public.domains limit 1)],'[{"question_id":"20000000-0000-0000-0000-000000000001","answer":"A valid answer"}]');
select public.submit_application(:'app_id');
select public.test_assert((select status='submitted' from public.applications where id=:'app_id'),'submission persisted');
select public.test_assert((select count(*)=1 from public.notifications),'submission creates one notification');
select public.test_denied(format('select public.submit_application(%L)', :'app_id'),'duplicate submission rejected');
select public.test_denied($$select public.save_application_draft('10000000-0000-0000-0000-000000000001','changed','','','',array[]::uuid[])$$,'submitted application locked');
update public.applications set motivation='forged' where id=:'app_id';
select public.test_assert((select motivation='I build robots' from public.applications where id=:'app_id'),'direct application changes blocked by RLS');
select public.test_denied(format('select public.update_application_status(%L, ''selected'')', :'app_id'),'applicant review endpoint denied');
select public.test_denied($$update public.notifications set message='forged' where user_id=auth.uid()$$,'notification content immutable');
update public.notifications set read=true where user_id=auth.uid();
select public.test_assert((select bool_and(read and read_at is not null) from public.notifications),'notification read state persisted');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_assert((select count(*)=0 from public.applications),'cross-applicant application isolation');
select public.test_assert((select count(*)=0 from public.notifications),'cross-applicant notification isolation');
select public.test_assert((select count(*)=0 from public.evaluations),'applicant evaluations private');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select public.test_assert((select count(*)=1 from public.applications),'admin reviews applications without an assignment');
select public.test_denied($$select public.set_user_role('00000000-0000-0000-0000-000000000002','admin')$$,'review admin cannot grant roles');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select public.test_denied($$select public.create_admin_invite('intruder@test.local','super_admin')$$,'admin cannot invite super admin');
insert into public.application_reviewer_assignments(application_id,reviewer_id,assigned_by) values(:'app_id','00000000-0000-0000-0000-000000000003',auth.uid());
select public.update_application_status(:'app_id','under_review');
select public.test_assert((public.list_applications('Applicant One','under_review','FY','IT')->>'total')::integer=1,'server filters and count');
select public.test_assert((public.dashboard_metrics()->>'underReview')::integer=1,'server metrics aggregate correctly');
select public.test_denied(format('select public.update_application_status(%L, ''selected'')', :'app_id'),'invalid status transition denied');
select public.update_application_status(:'app_id','shortlisted');
select id as interview_id from public.schedule_interview(:'app_id',now()+interval '1 hour','00000000-0000-0000-0000-000000000003') \gset
select public.test_denied(format('select public.schedule_interview(%L, now()+interval ''1 hour'', ''00000000-0000-0000-0000-000000000003'')', :'app_id'),'interviewer double booking rejected');
insert into public.achievements(title,description,year,published) values('Published result','actual',2026,true),('Private draft','private',2026,false);
select public.test_denied($$select count(*) from public.audit_logs$$,'retained activity archive is not an admin feature');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select public.test_assert((select count(*)=1 from public.applications),'admin performs reviewer duties');
insert into public.evaluations(application_id,evaluator_id,technical_score,overall_score) values(:'app_id',auth.uid(),8,40);
select public.test_denied(format('insert into public.evaluations(application_id,evaluator_id,technical_score) values(%L,auth.uid(),99)', :'app_id'),'invalid evaluation score rejected');
insert into public.application_notes(application_id,body) values(:'app_id','Private observation');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.test_assert((select count(*)=0 from public.interviews),'raw interview notes private');
select public.test_assert((select count(*)=1 from public.my_interviews()),'applicant sees interview schedule through safe RPC');
select public.test_assert((select count(*)=0 from public.application_notes),'applicant cannot see internal notes');
select public.test_assert((select count(*)=0 from public.evaluations),'applicant cannot see internal scores');
select public.test_denied($$insert into storage.objects(bucket_id,name,owner_id) values('private-applicant-files','00000000-0000-0000-0000-000000000002/file.pdf',auth.uid()::text)$$,'cross-user private upload denied');
insert into storage.objects(bucket_id,name,owner_id) values('private-applicant-files','00000000-0000-0000-0000-000000000001/file.pdf',auth.uid()::text);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_assert((select count(*)=0 from storage.objects),'cross-user private file read denied');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
select token as invite_token,id as invite_id from public.create_admin_invite('invite@test.local','admin') \gset
select public.test_assert((select bool_and(token is null and length(token_hash)=64) from public.admin_invites),'only hashed invitation secrets stored');
select public.test_denied($$select count(*) from public.audit_logs$$,'activity archive hidden even from super-admin API');
select public.test_denied($$select public.create_admin_invite('retired@test.local','recruiter')$$,'retired role invitation denied');
select public.test_denied($$select public.set_user_role('00000000-0000-0000-0000-000000000002','recruiter')$$,'retired role assignment denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_denied(format('select public.accept_admin_invite(%L)', :'invite_token'),'wrong email invitation rejected');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000006',false);
select public.accept_admin_invite(:'invite_token');
select public.test_assert(public.current_role()='admin','matching verified invite grants intended role');
select public.test_denied(format('select public.accept_admin_invite(%L)', :'invite_token'),'invitation reuse rejected');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
select token as revoked_token,id as revoked_id from public.create_admin_invite('two@test.local','admin') \gset
select public.revoke_admin_invite(:'revoked_id');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_denied(format('select public.accept_admin_invite(%L)', :'revoked_token'),'revoked invitation rejected');

reset role;
update public.recruitment_cycles set application_close=now()-interval '1 second',application_open=now()-interval '2 days' where id='10000000-0000-0000-0000-000000000001';
update public.user_roles set role='applicant' where user_id='00000000-0000-0000-0000-000000000003';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select public.test_assert((select count(*)=0 from public.applications),'revoked admin loses reviewer access immediately');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_denied($$select public.save_application_draft('10000000-0000-0000-0000-000000000001','late','','','',array[]::uuid[])$$,'backend deadline enforced');
reset role;
select set_config('request.jwt.claim.sub','',false);
set role anon;
select public.test_assert((select count(*)=1 from public.achievements where title in ('Published result','Private draft')),'public sees only published CMS content');
select public.test_assert((select count(*)=0 from public.profiles),'anonymous private profiles denied');
select public.test_denied($$insert into storage.objects(bucket_id,name) values('club-media','attack.png')$$,'anonymous media write denied');
select public.test_denied($$select public.create_admin_invite('bad@test.local','admin')$$,'anonymous privileged RPC denied');

-- Runtime checks for choice configuration, all answer types, and changed campaigns.
reset role;
insert into public.recruitment_cycles(id,name,academic_year,target_batch,application_open,application_close,status)
values('10000000-0000-0000-0000-000000000002','Question edge cases','test','FY/SY',now()-interval '1 day',now()+interval '1 day','open');
insert into public.recruitment_questions(id,recruitment_cycle_id,question,question_type,required,options) values
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Optional choice','single_choice',false,'["A","B"]'),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','Multiple choice','multi_choice',true,'["X","Y"]'),
 ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','Numeric answer','number',true,'[]'),
 ('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','Optional URL','url',false,'[]');
select public.test_denied($$insert into public.recruitment_questions(recruitment_cycle_id,question,question_type,options) values('10000000-0000-0000-0000-000000000002','Bad options','single_choice','["A","A"]')$$,'duplicate choice configuration rejected');
select public.test_denied($$insert into public.recruitment_questions(recruitment_cycle_id,question,question_type,options) values('10000000-0000-0000-0000-000000000002','Bad options','multi_choice','[1]')$$,'non-text choice configuration rejected');
select public.test_assert((select public.validate_answer(q,'0') from public.recruitment_questions q where id='20000000-0000-0000-0000-000000000004'),'numeric zero is a valid required answer');
select public.test_assert((select not public.validate_answer(q,'["X","X"]') from public.recruitment_questions q where id='20000000-0000-0000-0000-000000000003'),'duplicate multi choice answer invalid');
select public.test_assert((select not public.validate_answer(q,'"javascript:alert(1)"') from public.recruitment_questions q where id='20000000-0000-0000-0000-000000000005'),'unsafe answer URL invalid');
select id as domain_id from public.domains where active order by id limit 1 \gset
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
update public.profiles set phone='12345',branch='IT',year='SY',division='B' where id=auth.uid();
select id as second_app from public.save_application_draft('10000000-0000-0000-0000-000000000002','Build robots','','','',array(select id from public.domains where active order by id limit 2),'[
 {"question_id":"20000000-0000-0000-0000-000000000002","answer":""},
 {"question_id":"20000000-0000-0000-0000-000000000003","answer":["X"]},
 {"question_id":"20000000-0000-0000-0000-000000000004","answer":0},
 {"question_id":"20000000-0000-0000-0000-000000000005","answer":""}]') \gset
reset role;
update public.domains set active=false where id=:'domain_id';
set role authenticated;
select public.test_denied(format('select public.submit_application(%L)', :'second_app'),'submission rechecks active domains');
reset role;
update public.domains set active=true where id=:'domain_id';
update public.recruitment_cycles set max_preferences=1 where id='10000000-0000-0000-0000-000000000002';
set role authenticated;
select public.test_denied(format('select public.submit_application(%L)', :'second_app'),'submission rechecks changed preference limit');
select public.save_application_draft('10000000-0000-0000-0000-000000000002','Build robots','','','',array[:'domain_id'::uuid],'[
 {"question_id":"20000000-0000-0000-0000-000000000002","answer":""},
 {"question_id":"20000000-0000-0000-0000-000000000003","answer":["X"]},
 {"question_id":"20000000-0000-0000-0000-000000000004","answer":0},
 {"question_id":"20000000-0000-0000-0000-000000000005","answer":""}]');
select public.submit_application(:'second_app');
select public.test_assert((select status='submitted' from public.applications where id=:'second_app'),'blank optional answers do not prevent submission');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select public.test_denied($$delete from public.recruitment_cycles where id='10000000-0000-0000-0000-000000000002'$$,'campaign history protected');
select public.test_denied($$delete from public.recruitment_questions where id='20000000-0000-0000-0000-000000000004'$$,'question answer history protected');
select public.test_assert(public.send_member_notifications(array['00000000-0000-0000-0000-000000000002'::uuid],'Notice','Real message','30000000-0000-0000-0000-000000000001')=1,'admin message delivers once');
select public.test_assert(public.send_member_notifications(array['00000000-0000-0000-0000-000000000002'::uuid],'Notice','Real message','30000000-0000-0000-0000-000000000001')=0,'repeated message request id is idempotent');
select public.test_denied($$select public.set_user_role('00000000-0000-0000-0000-000000000002','admin')$$,'admin cannot grant administrative role');

-- Tasks validate ownership, URLs, eligibility and the server clock on every upsert.
insert into public.recruitment_tasks(id,recruitment_cycle_id,title,instructions,deadline,active)
values('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Robot task','Build it',now()+interval '1 day',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.submit_task('40000000-0000-0000-0000-000000000001',:'app_id','https://example.com/repo','https://example.com/demo','First');
select public.submit_task('40000000-0000-0000-0000-000000000001',:'app_id','https://example.com/repo2','https://example.com/demo2','Updated');
select public.test_assert((select count(*)=1 and bool_and(notes='Updated') from public.task_submissions),'task updates persist without duplicates');
select public.test_denied(format('select public.submit_task(''40000000-0000-0000-0000-000000000001'',%L,''javascript:bad'',''https://example.com'')', :'app_id'),'unsafe task URL denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_denied(format('select public.submit_task(''40000000-0000-0000-0000-000000000001'',%L,''https://example.com'',''https://example.com'')', :'app_id'),'cross-user task submission denied');
reset role;
update public.recruitment_tasks set deadline=now()-interval '1 second' where id='40000000-0000-0000-0000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.test_denied(format('select public.submit_task(''40000000-0000-0000-0000-000000000001'',%L,''https://example.com'',''https://example.com'')', :'app_id'),'task deadline enforced');

-- Expired, unverified and no-longer-authorised invitations must never grant roles.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
select token as expired_token,id as expired_id from public.create_admin_invite('two@test.local','admin') \gset
reset role;
update public.admin_invites set expires_at=now()-interval '1 second' where id=:'expired_id';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_denied(format('select public.accept_admin_invite(%L)', :'expired_token'),'expired invitation rejected');
reset role;
insert into auth.users(id,email) values('00000000-0000-0000-0000-000000000007','unverified@test.local');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
select token as unverified_token from public.create_admin_invite('unverified@test.local','admin') \gset
select token as demoted_token from public.create_admin_invite('two@test.local','admin') \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000007',false);
select public.test_denied(format('select public.accept_admin_invite(%L)', :'unverified_token'),'unverified invitation rejected');
reset role;
update public.user_roles set role='applicant' where user_id='00000000-0000-0000-0000-000000000005';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_denied(format('select public.accept_admin_invite(%L)', :'demoted_token'),'demoted inviter cannot grant role');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select public.test_assert((select count(*)=0 from public.evaluations),'revoked evaluator loses historical scores');
select public.test_denied($$insert into public.projects(title,description,year) values('Attack','x',2026)$$,'revoked staff cannot write CMS');

-- Simulate a still-unexpired JWT after Supabase Auth bans the account.
reset role;
update auth.users set banned_until=now()+interval '1 day' where id in('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.test_assert(public.current_role() is null,'banned account has no active role');
select public.test_assert((select count(*)=0 from public.profiles),'banned JWT cannot read own profile');
select public.test_assert((select count(*)=0 from public.applications),'banned JWT cannot read applications');
select public.test_assert((select count(*)=0 from storage.objects),'banned JWT cannot read private file objects');
select public.test_assert((select count(*)=0 from public.my_interviews()),'banned JWT cannot use interview RPC');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select public.test_denied($$select public.dashboard_metrics()$$,'banned admin JWT cannot use privileged RPC');
select public.test_denied($$insert into public.projects(title,description,year) values('Attack','x',2026)$$,'banned admin JWT cannot write CMS');

-- Retirement is enforced in the database, not just hidden in the role dropdown.
reset role;
select public.test_assert((select count(*) from public.audit_logs)=(select retained_count from public.test_retirement_snapshot),'historical activity retained with no new activity generated');
select public.test_assert((select revoked_at is not null from public.admin_invites where id='88888888-0000-4000-8000-000000000002'),'legacy recruiter invitation revoked without deletion');
select public.test_denied($$insert into public.user_roles(user_id,role) values('00000000-0000-0000-0000-000000000002','recruiter')$$,'retired role blocked even through direct database writes');
set role authenticated;
select set_config('request.jwt.claim.sub','88888888-0000-4000-8000-000000000001',false);
select public.test_assert(not exists(select 1 from public.inspect_admin_invite('88888888-0000-4000-8000-000000000003')),'retired invitation cannot be inspected or accepted');
select public.test_denied($$select public.accept_admin_invite('88888888-0000-4000-8000-000000000003')$$,'retired invitation acceptance blocked');
select public.test_assert(public.send_member_notifications(array['00000000-0000-0000-0000-000000000002'::uuid],'Old request','Retry','88888888-0000-4000-8000-000000000005')=0,'historical notification retry remains idempotent after activity removal');
select public.test_denied($$select * from public.member_notification_receipts$$,'notification retry receipts are not a readable activity feed');
