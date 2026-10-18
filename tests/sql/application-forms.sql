-- Isolated fixtures only. Production deployment smoke checks never run this file.
reset role;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('81000000-0000-0000-0000-000000000001','form-admin@test.local',now(),'{"full_name":"Form Admin"}'),
 ('81000000-0000-0000-0000-000000000002','form-one@test.local',now(),'{"full_name":"Form One"}'),
 ('81000000-0000-0000-0000-000000000003','form-two@test.local',now(),'{"full_name":"Form Two"}');
update public.user_roles set role='admin' where user_id='81000000-0000-0000-0000-000000000001';
insert into public.recruitment_cycles(id,name,academic_year,target_batch,application_open,application_close,status,max_preferences)
 values('82000000-0000-0000-0000-000000000001','SY builder test','test','SY',now()-interval '1 day',now()+interval '1 day','open',2);
create function public.test_form_field(p_id text,p_type text,p_binding text default '',p_required boolean default true,p_options jsonb default '[]') returns jsonb language sql immutable as $$
 select jsonb_build_object('id',p_id,'label',p_id,'type',p_type,'binding',p_binding,'required',p_required,'help','','placeholder','','options',p_options,'maxSelections',2);
$$;
select jsonb_build_object('title','PICT SY application','description','Owner-controlled form','sections',jsonb_build_array(jsonb_build_object(
 'id','student','title','Student details','description','','fields',jsonb_build_array(
 public.test_form_field('name','short_text','profile.full_name'),
 public.test_form_field('email','email','identity.email'),
 public.test_form_field('branch','select','profile.branch',true,'[{"value":"CE","label":"CE"},{"value":"IT","label":"IT"},{"value":"ENTC","label":"ENTC"},{"value":"AIDS","label":"AIDS"},{"value":"ECE","label":"ECE"}]'),
 public.test_form_field('division','short_text','profile.division'),
 public.test_form_field('year','select','profile.year',true,'[{"value":"SY","label":"Second Year (SY)"}]'),
 public.test_form_field('score','number'),
 public.test_form_field('choices','multi_choice','',true,'[{"value":"ROS","label":"ROS"},{"value":"PCB","label":"PCB"}]'),
 public.test_form_field('date','date'),public.test_form_field('url','url','',false),public.test_form_field('file','file')
 )))) as schema \gset
insert into storage.objects(bucket_id,name,owner_id) values('private-applicant-files','81000000-0000-0000-0000-000000000002/resume.pdf','81000000-0000-0000-0000-000000000002');
set role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000001',false);
select public.save_application_form('82000000-0000-0000-0000-000000000001',:'schema',0);
select public.test_assert((select draft_revision=1 and published_schema is null from public.recruitment_application_forms where recruitment_cycle_id='82000000-0000-0000-0000-000000000001'),'builder save does not publish');
select public.test_denied(format('select public.save_application_form(%L,%L,0)','82000000-0000-0000-0000-000000000001',:'schema'),'stale admin save cannot overwrite another draft');
select public.test_denied(format('select public.save_application_form(%L,%L,1)','82000000-0000-0000-0000-000000000001',jsonb_set(:'schema','{sections,0,fields,0,binding}','"user_roles.role"')),'form cannot bind privileged columns');
select public.test_denied(format('select public.save_application_form(%L,%L,1)','82000000-0000-0000-0000-000000000001',jsonb_set(:'schema','{sections,0,fields,3,type}','"select"')),'class division stays free text');
select public.test_denied(format('select public.save_application_form(%L,%L,1)','82000000-0000-0000-0000-000000000001',jsonb_set(:'schema','{sections,0,fields,4,options}','[{"value":"FY","label":"First year"}]')),'SY-only drive rejects FY option');
select public.publish_application_form('82000000-0000-0000-0000-000000000001',1);
select public.test_assert((select published_revision=1 from public.recruitment_application_forms where recruitment_cycle_id='82000000-0000-0000-0000-000000000001'),'regular admin publishes form');
select public.test_denied($$update public.recruitment_application_forms set published_schema='{}' where recruitment_cycle_id='82000000-0000-0000-0000-000000000001'$$,'even admins use validated form RPCs rather than direct writes');
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000002',false);
select public.test_assert((select count(*)=0 from public.recruitment_application_forms),'applicant cannot read private builder drafts');
select public.test_assert(public.get_published_application_form('82000000-0000-0000-0000-000000000001')->>'mode'='builder','applicant reads only published form');
select public.test_assert(not exists(select 1 from public.applications where recruitment_cycle_id='82000000-0000-0000-0000-000000000001'),'reading form does not create application drafts');
select public.test_denied(format('select public.save_application_form(%L,%L,1)','82000000-0000-0000-0000-000000000001',:'schema'),'applicant cannot edit builder');
select public.test_denied($$select public.publish_application_form('82000000-0000-0000-0000-000000000001',1)$$,'applicant cannot publish forms');
select public.test_denied($$select public.save_legacy_application_draft('82000000-0000-0000-0000-000000000001','','','','',array[]::uuid[])$$,'private legacy draft function is not an API bypass');
select public.test_denied($$select public.save_application_draft('82000000-0000-0000-0000-000000000001','','','','',array[]::uuid[])$$,'public legacy endpoint cannot create unconfigured applications');
select id as form_app from public.save_built_application_draft('82000000-0000-0000-0000-000000000001',1,'{}') \gset
select public.test_assert((select form_revision=1 and form_schema=:'schema'::jsonb from public.applications where id=:'form_app'),'first explicit draft save pins schema');
select public.test_denied(format('select public.submit_application(%L)',:'form_app'),'server enforces admin required fields');
select public.test_denied($$select public.save_built_application_draft('82000000-0000-0000-0000-000000000001',1,'{"invented":"injection"}')$$,'unknown form field keys rejected');
select '{"name":"Form One","email":"form-one@test.local","branch":"AIDS","division":"SY-AIDS-2","year":"SY","score":0,"choices":["ROS"],"date":"2026-10-18","url":"","file":"81000000-0000-0000-0000-000000000002/resume.pdf"}'::jsonb as values \gset
select public.test_denied(format('select public.save_built_application_draft(%L,1,%L)','82000000-0000-0000-0000-000000000001',jsonb_set(:'values','{branch}','"Mechanical"')),'server rejects unoffered branch');
select public.test_denied(format('select public.save_built_application_draft(%L,1,%L)','82000000-0000-0000-0000-000000000001',jsonb_set(:'values','{year}','"FY"')),'server rejects FY answers for SY drive');
select public.test_denied(format('select public.save_built_application_draft(%L,1,%L)','82000000-0000-0000-0000-000000000001',jsonb_set(:'values','{choices}','["ROS","ROS"]')),'duplicate custom multi-choice answers rejected');
select public.test_denied(format('select public.save_built_application_draft(%L,1,%L)','82000000-0000-0000-0000-000000000001',jsonb_set(:'values','{choices}','["outside"]')),'unoffered custom choices rejected');
select public.test_denied(format('select public.save_built_application_draft(%L,1,%L)','82000000-0000-0000-0000-000000000001',jsonb_set(:'values','{score}','"0"')),'numeric fields reject string numbers');
select public.test_denied(format('select public.save_built_application_draft(%L,1,%L)','82000000-0000-0000-0000-000000000001',jsonb_set(:'values','{email}','"other@test.local"')),'account email cannot be forged');
select public.test_denied(format('select public.save_built_application_draft(%L,1,%L)','82000000-0000-0000-0000-000000000001',jsonb_set(:'values','{url}','"javascript:alert(1)"')),'unsafe custom URL rejected');
select public.test_denied(format('select public.save_built_application_draft(%L,1,%L)','82000000-0000-0000-0000-000000000001',jsonb_set(:'values','{date}','"2026-02-31"')),'invalid calendar date rejected');
select public.test_denied(format('select public.save_built_application_draft(%L,1,%L)','82000000-0000-0000-0000-000000000001',jsonb_set(:'values','{file}','"81000000-0000-0000-0000-000000000003/resume.pdf"')),'foreign file references rejected');
select public.test_denied(format('select public.save_built_application_draft(%L,1,%L)','82000000-0000-0000-0000-000000000001',jsonb_set(:'values','{file}','"81000000-0000-0000-0000-000000000002/missing.pdf"')),'missing file references rejected');
select public.save_built_application_draft('82000000-0000-0000-0000-000000000001',1,:'values');
select public.test_assert((select branch='AIDS' and division='SY-AIDS-2' and year='SY' from public.profiles where id=auth.uid()),'linked answers update only the applicant profile');
select public.test_assert((select form_values->'score'='0'::jsonb from public.applications where id=:'form_app'),'numeric zero persists as a number');
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000001',false);
select public.save_application_form('82000000-0000-0000-0000-000000000001',jsonb_set(:'schema','{sections,0,fields}',(:'schema'::jsonb #> '{sections,0,fields}')||jsonb_build_array(public.test_form_field('new_required','short_text'))),1);
select public.test_denied($$select public.publish_application_form('82000000-0000-0000-0000-000000000001',1)$$,'stale publish rejects a newer draft');
select public.publish_application_form('82000000-0000-0000-0000-000000000001',2);
select public.test_assert((select form_schema=:'schema'::jsonb from public.applications where id=:'form_app'),'publishing edits does not rewrite saved schemas');
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000002',false);
select public.test_assert((public.get_published_application_form('82000000-0000-0000-0000-000000000001')->>'revision')::integer=1,'saved draft loads original version after republish');
select public.save_built_application_draft('82000000-0000-0000-0000-000000000001',1,:'values');
select public.submit_application(:'form_app');
select public.test_assert((select status='submitted' from public.applications where id=:'form_app'),'old version submits without new version required fields');
select public.test_assert((select count(*)=1 from public.notifications where user_id=auth.uid() and title='Application submitted'),'built submission creates exactly one notification');
select public.test_denied(format('select public.submit_application(%L)',:'form_app'),'built submission is idempotently locked');
select public.test_denied(format('select public.save_built_application_draft(%L,1,%L)','82000000-0000-0000-0000-000000000001',:'values'),'submitted built answers cannot be edited');
delete from storage.objects where name='81000000-0000-0000-0000-000000000002/resume.pdf';
select public.test_assert(exists(select 1 from storage.objects where name='81000000-0000-0000-0000-000000000002/resume.pdf'),'submitted form attachment cannot be deleted');
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000003',false);
select public.test_assert((public.get_published_application_form('82000000-0000-0000-0000-000000000001')->>'revision')::integer=2,'new applicants receive new published form');
select public.test_assert(not exists(select 1 from public.applications where id=:'form_app'),'custom response isolation across accounts');
select public.test_denied($$select public.save_built_application_draft('82000000-0000-0000-0000-000000000001',1,'{}')$$,'new applicant cannot choose superseded schema');
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000001',false);
select public.unpublish_application_form('82000000-0000-0000-0000-000000000001',2);
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000003',false);
select public.test_assert(public.get_published_application_form('82000000-0000-0000-0000-000000000001')->>'mode'='unpublished','unpublished form hides new entry point');
select public.test_denied($$select public.save_built_application_draft('82000000-0000-0000-0000-000000000001',2,'{}')$$,'unpublished form blocks direct draft creation');
reset role;
update public.recruitment_cycles set status='closed' where id='82000000-0000-0000-0000-000000000001';
set role authenticated;
select public.test_denied($$select public.save_built_application_draft('82000000-0000-0000-0000-000000000001',2,'{}')$$,'built form respects campaign closure');
set role anon;
select public.test_denied($$select public.get_published_application_form('82000000-0000-0000-0000-000000000001')$$,'anonymous form endpoint denied');
select public.test_denied($$select public.save_application_form('82000000-0000-0000-0000-000000000001','{}',0)$$,'anonymous builder mutation denied');
reset role;
update auth.users set banned_until=now()+interval '1 day' where id='81000000-0000-0000-0000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000001',false);
select public.test_assert((select count(*)=0 from public.recruitment_application_forms),'banned admin cannot read drafts with an old JWT');
select public.test_denied($$select public.publish_application_form('82000000-0000-0000-0000-000000000001',2)$$,'banned admin cannot publish forms');
reset role;
