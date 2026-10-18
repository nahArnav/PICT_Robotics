-- Fixture runs BEFORE the builder migrations, in the disposable database only.
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
 values('99000000-0000-0000-0000-000000000001','legacy-draft@test.local',now(),'{"full_name":"Preserved Student"}');
update public.profiles set branch='IT',year='SY',division='SY-IT-C',phone='1234567890',skills=array['ROS','Python'] where id='99000000-0000-0000-0000-000000000001';
insert into public.recruitment_cycles(id,name,academic_year,target_batch,application_open,application_close,status)
 values('99000000-0000-0000-0000-000000000002','Legacy upgrade fixture','test','FY/SY',now()-interval '1 day',now()+interval '1 day','open');
insert into public.recruitment_questions(id,recruitment_cycle_id,question,question_type,required,active) values
 ('99000000-0000-0000-0000-000000000003','99000000-0000-0000-0000-000000000002','Original active answer','number',true,true),
 ('99000000-0000-0000-0000-000000000004','99000000-0000-0000-0000-000000000002','Original inactive answer','long_text',false,false);
insert into public.applications(id,applicant_id,recruitment_cycle_id,motivation,experience_summary)
 values('99000000-0000-0000-0000-000000000005','99000000-0000-0000-0000-000000000001','99000000-0000-0000-0000-000000000002','Existing motivation','Existing project');
insert into public.application_answers(application_id,question_id,answer) values
 ('99000000-0000-0000-0000-000000000005','99000000-0000-0000-0000-000000000003','0'),
 ('99000000-0000-0000-0000-000000000005','99000000-0000-0000-0000-000000000004','"Existing archived answer"');
insert into public.application_domain_preferences(application_id,domain_id,preference_order)
 select '99000000-0000-0000-0000-000000000005',id,1 from public.domains where active limit 1;
