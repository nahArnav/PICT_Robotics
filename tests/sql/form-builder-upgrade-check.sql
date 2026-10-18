-- Abort on any answer loss, then remove ONLY exact disposable fixture records.
do $$
declare a public.applications;
begin
 select * into a from public.applications where id='99000000-0000-0000-0000-000000000005';
 if not exists(select 1 from pg_trigger where tgrelid='public.applications'::regclass and tgname='application_form_snapshot_guard' and tgenabled='O') then raise exception 'Snapshot protection was not restored'; end if;
 if a.status<>'draft' or a.form_schema is null or a.form_revision<>1
   or a.form_values->>'division'<>'SY-IT-C' or a.form_values->>'motivation'<>'Existing motivation'
   or a.form_values->>'experience'<>'Existing project' or a.form_values->>'skills'<>'ROS, Python'
   or a.form_values->'q_99000000-0000-0000-0000-000000000003'<>'0'::jsonb
   or a.form_values->>'archived_99000000-0000-0000-0000-000000000004'<>'Existing archived answer'
 then raise exception 'Legacy draft answers were not preserved by the form migration'; end if;
 if (select count(*) from public.application_answers where application_id=a.id)<>2
   or not exists(select 1 from public.application_domain_preferences where application_id=a.id)
   or (select division from public.profiles where id=a.applicant_id)<>'SY-IT-C' then raise exception 'Original draft records changed'; end if;
 raise notice 'PASS: legacy draft, profile, preferences, active/numeric-zero and inactive answers survive the builder upgrade';
end; $$;
delete from public.applications where id='99000000-0000-0000-0000-000000000005';
delete from public.recruitment_cycles where id='99000000-0000-0000-0000-000000000002';
delete from auth.users where id='99000000-0000-0000-0000-000000000001';
