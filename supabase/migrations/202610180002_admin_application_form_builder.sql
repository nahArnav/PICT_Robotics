-- Admin-authored, per-drive forms. Published schemas are copied into each new
-- application on its first explicit save; existing legacy applications stay intact.
create table public.recruitment_application_forms (
 recruitment_cycle_id uuid primary key references public.recruitment_cycles(id) on delete cascade,
 draft_schema jsonb not null,
 draft_revision integer not null default 1 check(draft_revision>0),
 published_schema jsonb,
 published_revision integer not null default 0 check(published_revision>=0),
 updated_by uuid references public.profiles(id) on delete set null,
 updated_at timestamptz not null default now(),
 published_at timestamptz
);
alter table public.recruitment_application_forms enable row level security;
revoke all on public.recruitment_application_forms from anon,authenticated;
grant select on public.recruitment_application_forms to authenticated;
create policy "active admins read form builder" on public.recruitment_application_forms
 for select to authenticated using(public.is_admin());

alter table public.applications
 add column form_schema jsonb,
 add column form_revision integer,
 add column form_values jsonb not null default '{}'::jsonb,
 add constraint application_form_snapshot_shape check(
   jsonb_typeof(form_values)='object' and
   ((form_schema is null and form_revision is null) or
    (form_schema is not null and form_revision is not null and jsonb_typeof(form_schema)='object' and form_revision>0))
 );

create function public.guard_application_form_snapshot() returns trigger language plpgsql as $$
begin
 if new.form_schema is distinct from old.form_schema or new.form_revision is distinct from old.form_revision then
   raise exception 'An application keeps its original published form';
 end if;
 if old.status<>'draft' and new.form_values is distinct from old.form_values then
   raise exception 'Submitted form answers cannot be edited';
 end if;
 return new;
end; $$;
create trigger application_form_snapshot_guard before update on public.applications
 for each row execute function public.guard_application_form_snapshot();

create function public.validate_application_form_schema(p_schema jsonb,p_publish boolean,p_cycle_id uuid) returns void
language plpgsql stable set search_path=public as $$
declare section jsonb; field jsonb; option jsonb; ids text[]:='{}'; bindings text[]:='{}';
 field_count integer:=0; binding text; kind text; allowed_binding text; cycle public.recruitment_cycles;
begin
 if jsonb_typeof(p_schema) is distinct from 'object' or octet_length(p_schema::text)>131072
   or jsonb_typeof(p_schema->'title') is distinct from 'string' or length(p_schema->>'title')>200
   or jsonb_typeof(p_schema->'description') is distinct from 'string' or length(p_schema->>'description')>4000
   or jsonb_typeof(p_schema->'sections') is distinct from 'array' then raise exception 'Invalid form schema'; end if;
 if jsonb_array_length(p_schema->'sections')>12 or
   (p_publish and (length(trim(p_schema->>'title'))=0 or jsonb_array_length(p_schema->'sections')=0)) then raise exception 'Add a form title and 1–12 sections'; end if;
 select * into cycle from public.recruitment_cycles where id=p_cycle_id;
 if not found then raise exception 'Recruitment campaign not found'; end if;
 for section in select value from jsonb_array_elements(p_schema->'sections') loop
   if jsonb_typeof(section) is distinct from 'object' or coalesce(section->>'id','') !~ '^[A-Za-z0-9_-]{1,80}$'
     or (section->>'id')=any(ids) or jsonb_typeof(section->'title') is distinct from 'string'
     or length(section->>'title')>200 or jsonb_typeof(section->'description') is distinct from 'string'
     or length(section->>'description')>4000 or jsonb_typeof(section->'fields') is distinct from 'array' then raise exception 'Invalid section'; end if;
   ids:=array_append(ids,section->>'id');
   if p_publish and (length(trim(section->>'title'))=0 or jsonb_array_length(section->'fields')=0) then raise exception 'Each section needs a title and fields'; end if;
   for field in select value from jsonb_array_elements(section->'fields') loop
     field_count:=field_count+1;
     if field_count>60 or jsonb_typeof(field) is distinct from 'object' or coalesce(field->>'id','') !~ '^[A-Za-z0-9_-]{1,80}$'
       or (field->>'id')=any(ids) or jsonb_typeof(field->'label') is distinct from 'string'
       or length(trim(field->>'label')) not between 1 and 200
       or jsonb_typeof(field->'required') is distinct from 'boolean'
       or jsonb_typeof(field->'help') is distinct from 'string' or length(field->>'help')>1000
       or jsonb_typeof(field->'placeholder') is distinct from 'string' or length(field->>'placeholder')>300
       or jsonb_typeof(field->'binding') is distinct from 'string'
       or jsonb_typeof(field->'options') is distinct from 'array'
       or jsonb_typeof(field->'maxSelections') is distinct from 'number'
       or coalesce(field->>'maxSelections','') !~ '^[1-3]$' then raise exception 'Invalid field (limit: 60 fields)'; end if;
     ids:=array_append(ids,field->>'id'); binding:=field->>'binding'; kind:=field->>'type';
     if kind is null or kind not in ('short_text','long_text','email','phone','url','number','date','select','radio','multi_choice','file','domains') then raise exception 'Unsupported field type'; end if;
     if binding<>'' then
       if binding=any(bindings) then raise exception 'A profile/application field may only be linked once'; end if;
       bindings:=array_append(bindings,binding);
       if binding not in ('identity.email','profile.full_name','profile.phone','profile.roll_number','profile.branch','profile.year','profile.division','profile.skills','profile.programming_languages','profile.github_url','profile.linkedin_url','profile.portfolio_url','profile.bio','application.motivation','application.experience_summary','domains') then raise exception 'Unsupported linked field'; end if;
       if (binding='identity.email' and kind<>'email')
         or (binding='profile.year' and kind<>'select')
         or (binding='profile.division' and kind<>'short_text')
         or (binding in ('profile.github_url','profile.linkedin_url','profile.portfolio_url') and kind<>'url')
         or (binding='domains' and kind<>'domains')
         or (binding not in ('identity.email','profile.year','domains','profile.github_url','profile.linkedin_url','profile.portfolio_url') and kind not in ('short_text','long_text','phone','select','radio')) then raise exception 'Invalid type for linked field %',binding; end if;
     end if;
     if kind='domains' and binding<>'domains' then raise exception 'A domain preference field must link to domains'; end if;
     if jsonb_array_length(field->'options')>80 then raise exception 'Use at most 80 options per field'; end if;
     if p_publish and kind in ('select','radio','multi_choice','domains') and jsonb_array_length(field->'options')=0 then raise exception 'Add options for %',field->>'label'; end if;
     if jsonb_array_length(field->'options')<>(select count(distinct value->>'value') from jsonb_array_elements(field->'options')) then raise exception 'Option values must be unique'; end if;
     for option in select value from jsonb_array_elements(field->'options') loop
       if jsonb_typeof(option) is distinct from 'object' or jsonb_typeof(option->'value') is distinct from 'string'
         or length(trim(option->>'value')) not between 1 and 200 or jsonb_typeof(option->'label') is distinct from 'string'
         or length(trim(option->>'label')) not between 1 and 200 then raise exception 'Every option needs a value and label'; end if;
       if binding='profile.year' and ((option->>'value') not in ('FY','SY')
         or (upper(trim(cycle.target_batch)) in ('FY','SY') and option->>'value'<>upper(trim(cycle.target_batch)))) then raise exception 'Year options must match this drive: FY, SY, or both'; end if;
       if p_publish and kind='domains' and not exists(select 1 from public.domains where id::text=option->>'value' and active) then raise exception 'Choose active club domains'; end if;
     end loop;
     if kind='domains' and (field->>'maxSelections')::integer>cycle.max_preferences then raise exception 'Domain preference limit exceeds the campaign limit'; end if;
   end loop;
 end loop;
end; $$;

create function public.save_application_form(p_cycle_id uuid,p_schema jsonb,p_expected_revision integer) returns public.recruitment_application_forms
language plpgsql security definer set search_path=public as $$
declare f public.recruitment_application_forms;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 perform 1 from public.recruitment_cycles where id=p_cycle_id for update;
 if not found then raise exception 'Recruitment campaign not found'; end if;
 select * into f from public.recruitment_application_forms where recruitment_cycle_id=p_cycle_id for update;
 if coalesce(p_expected_revision,-1)<>coalesce(f.draft_revision,0) then raise exception 'Another admin changed this form. Reload before saving.'; end if;
 perform public.validate_application_form_schema(p_schema,false,p_cycle_id);
 insert into public.recruitment_application_forms(recruitment_cycle_id,draft_schema,updated_by)
 values(p_cycle_id,p_schema,auth.uid()) on conflict(recruitment_cycle_id) do update
 set draft_schema=excluded.draft_schema,draft_revision=recruitment_application_forms.draft_revision+1,updated_by=auth.uid(),updated_at=now()
 returning * into f;
 return f;
end; $$;

create function public.publish_application_form(p_cycle_id uuid,p_expected_revision integer) returns public.recruitment_application_forms
language plpgsql security definer set search_path=public as $$
declare f public.recruitment_application_forms;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 perform 1 from public.recruitment_cycles where id=p_cycle_id for update;
 select * into f from public.recruitment_application_forms where recruitment_cycle_id=p_cycle_id for update;
 if not found or coalesce(p_expected_revision,-1)<>f.draft_revision then raise exception 'Save or reload the current builder draft before publishing'; end if;
 perform public.validate_application_form_schema(f.draft_schema,true,p_cycle_id);
 update public.recruitment_application_forms set published_schema=draft_schema,published_revision=published_revision+1,
   published_at=now(),updated_at=now(),updated_by=auth.uid() where recruitment_cycle_id=p_cycle_id returning * into f;
 return f;
end; $$;

create function public.unpublish_application_form(p_cycle_id uuid,p_expected_revision integer) returns void
language plpgsql security definer set search_path=public as $$
declare f public.recruitment_application_forms;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 perform 1 from public.recruitment_cycles where id=p_cycle_id for update;
 select * into f from public.recruitment_application_forms where recruitment_cycle_id=p_cycle_id for update;
 if not found or coalesce(p_expected_revision,-1)<>f.published_revision then raise exception 'The publication changed. Reload first.'; end if;
 update public.recruitment_application_forms set published_schema=null,updated_at=now(),updated_by=auth.uid() where recruitment_cycle_id=p_cycle_id;
end; $$;

create function public.get_published_application_form(p_cycle_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare a public.applications; f public.recruitment_application_forms;
begin
 if public.current_role() is distinct from 'applicant'::public.app_role and not public.is_admin() then raise exception 'Sign in with an active account'; end if;
 select * into a from public.applications where applicant_id=auth.uid() and recruitment_cycle_id=p_cycle_id;
 if found then
   if a.form_schema is null then return jsonb_build_object('mode','legacy','pinned',true); end if;
   return jsonb_build_object('mode','builder','schema',a.form_schema,'revision',a.form_revision,'pinned',true);
 end if;
 if not public.is_admin() and not exists(select 1 from public.recruitment_cycles where id=p_cycle_id and status='open' and application_open<=now() and application_close>now()) then
   return jsonb_build_object('mode','unpublished');
 end if;
 select * into f from public.recruitment_application_forms where recruitment_cycle_id=p_cycle_id;
 if not found or f.published_schema is null then return jsonb_build_object('mode','unpublished'); end if;
 return jsonb_build_object('mode','builder','schema',f.published_schema,'revision',f.published_revision,'pinned',false);
end; $$;

create function public.validate_application_form_values(p_schema jsonb,p_values jsonb,p_required boolean,p_user_id uuid) returns void
language plpgsql stable set search_path=public as $$
declare field jsonb; answer jsonb; kind text; content text; field_ids text[]; count_options integer;
begin
 if jsonb_typeof(p_values) is distinct from 'object' or octet_length(p_values::text)>524288 then raise exception 'Invalid form answers'; end if;
 select array_agg(f->>'id') into field_ids from jsonb_array_elements(p_schema->'sections') s,
   jsonb_array_elements(s->'fields') f;
 if exists(select 1 from jsonb_object_keys(p_values) key where not key=any(field_ids)) then raise exception 'Answers contain an unknown field'; end if;
 for field in select f from jsonb_array_elements(p_schema->'sections') s,jsonb_array_elements(s->'fields') f loop
   answer:=p_values->(field->>'id'); kind:=field->>'type'; content:=answer #>> '{}';
   if answer is null or answer='null'::jsonb or answer='[]'::jsonb or (jsonb_typeof(answer)='string' and length(trim(content))=0) then
     if p_required and (field->>'required')::boolean then raise exception 'Required answer missing: %',field->>'label'; end if;
     continue;
   end if;
   if kind in ('multi_choice','domains') then
     if jsonb_typeof(answer)<>'array' then raise exception 'Invalid choices: %',field->>'label'; end if;
     if jsonb_array_length(answer)<>(select count(distinct value) from jsonb_array_elements(answer)) or exists(
       select 1 from jsonb_array_elements(answer) x where jsonb_typeof(x)<>'string' or not exists(
         select 1 from jsonb_array_elements(field->'options') o where o->'value'=x)) then raise exception 'Choose distinct offered options: %',field->>'label'; end if;
     if kind='domains' and jsonb_array_length(answer)>(field->>'maxSelections')::integer then raise exception 'Too many domain preferences'; end if;
   elsif kind='number' then
     if jsonb_typeof(answer)<>'number' then raise exception 'Enter a number: %',field->>'label'; end if;
   else
     if jsonb_typeof(answer)<>'string' or length(content)>20000 then raise exception 'Invalid text answer: %',field->>'label'; end if;
     if kind in ('select','radio') and not exists(select 1 from jsonb_array_elements(field->'options') o where o->>'value'=content) then raise exception 'Choose an offered option: %',field->>'label'; end if;
     if kind='url' and not public.valid_web_url(content) then raise exception 'Enter a valid HTTP(S) URL: %',field->>'label'; end if;
     if kind='email' and content !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email: %',field->>'label'; end if;
     if kind='date' then
       begin
         if content !~ '^\d{4}-\d{2}-\d{2}$' or to_char(content::date,'YYYY-MM-DD')<>content then raise exception 'Enter a valid date: %',field->>'label'; end if;
       exception when invalid_datetime_format or datetime_field_overflow then raise exception 'Enter a valid date: %',field->>'label';
       end;
     end if;
     if kind='file' and (split_part(content,'/',1)<>p_user_id::text or not exists(
       select 1 from storage.objects where bucket_id='private-applicant-files' and name=content)) then raise exception 'Upload your own private file: %',field->>'label'; end if;
     if field->>'binding'='identity.email' and content is distinct from (select email from public.profiles where id=p_user_id) then raise exception 'Account email cannot be changed in the form'; end if;
   end if;
 end loop;
end; $$;

create function public.save_built_application_draft(p_cycle_id uuid,p_form_revision integer,p_values jsonb) returns public.applications
language plpgsql security definer set search_path=public as $$
declare a public.applications; c public.recruitment_cycles; f public.recruitment_application_forms; schema jsonb; revision integer;
 field jsonb; binding text; answer jsonb; projection jsonb:='{}'; p public.profiles; projected public.profiles; domain_ids uuid[]:='{}';
 motivation text; experience text;
begin
 if public.current_role() is distinct from 'applicant'::public.app_role then raise exception 'Only applicants may save applications'; end if;
 select * into c from public.recruitment_cycles where id=p_cycle_id for share;
 if not found or c.status<>'open' or now()<c.application_open or now()>=c.application_close then raise exception 'This recruitment cycle is not accepting applications'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||c.id::text,0));
 select * into a from public.applications where applicant_id=auth.uid() and recruitment_cycle_id=c.id for update;
 if found then
   if a.status<>'draft' then raise exception 'A submitted application cannot be edited'; end if;
   if a.form_schema is null then raise exception 'Continue this saved application using its original form'; end if;
   schema:=a.form_schema; revision:=a.form_revision;
 else
   select * into f from public.recruitment_application_forms where recruitment_cycle_id=c.id for share;
   if not found or f.published_schema is null then raise exception 'An admin must publish an application form for this drive first'; end if;
   schema:=f.published_schema; revision:=f.published_revision;
 end if;
 if coalesce(p_form_revision,-1)<>revision then raise exception 'The form changed before your first save. Reload to use the current published form.'; end if;
 perform public.validate_application_form_values(schema,p_values,false,auth.uid());
 select * into p from public.profiles where id=auth.uid() for update;
 for field in select x from jsonb_array_elements(schema->'sections') s,jsonb_array_elements(s->'fields') x loop
   binding:=field->>'binding'; answer:=p_values->(field->>'id');
   if binding='domains' and jsonb_typeof(answer)='array' then select coalesce(array_agg(value::uuid),'{}') into domain_ids from jsonb_array_elements_text(answer); end if;
   if binding like 'profile.%' and p_values ? (field->>'id') then
     if binding in ('profile.skills','profile.programming_languages') then
       answer:=to_jsonb(array(select trim(x) from unnest(string_to_array(coalesce(answer #>> '{}',''),',')) x where trim(x)<>''));
     elsif answer in ('null'::jsonb,'""'::jsonb) and binding<>'profile.full_name' then answer:='null'::jsonb;
     end if;
     projection:=projection||jsonb_build_object(substr(binding,9),answer);
   end if;
   if binding='application.motivation' then motivation:=answer #>> '{}'; end if;
   if binding='application.experience_summary' then experience:=answer #>> '{}'; end if;
 end loop;
 projected:=jsonb_populate_record(p,projection);
 update public.profiles set full_name=coalesce(projected.full_name,p.full_name),phone=projected.phone,roll_number=projected.roll_number,
   branch=projected.branch,year=projected.year,division=projected.division,skills=projected.skills,
   programming_languages=projected.programming_languages,github_url=projected.github_url,linkedin_url=projected.linkedin_url,
   portfolio_url=projected.portfolio_url,bio=projected.bio where id=auth.uid();
 insert into public.applications(applicant_id,recruitment_cycle_id,motivation,experience_summary,github_url,portfolio_url,form_schema,form_revision,form_values)
 values(auth.uid(),c.id,motivation,experience,projected.github_url,projected.portfolio_url,schema,revision,p_values)
 on conflict(applicant_id,recruitment_cycle_id) do update set motivation=excluded.motivation,experience_summary=excluded.experience_summary,
   github_url=excluded.github_url,portfolio_url=excluded.portfolio_url,form_values=excluded.form_values returning * into a;
 delete from public.application_domain_preferences where application_id=a.id;
 insert into public.application_domain_preferences(application_id,domain_id,preference_order)
   select a.id,domain_id,position from unnest(domain_ids) with ordinality as choices(domain_id,position);
 return a;
end; $$;

-- Keep the original workflow private for saved legacy applications. It must not
-- be usable to bypass an admin-published schema for a new application.
alter function public.save_application_draft(uuid,text,text,text,text,uuid[],jsonb) rename to save_legacy_application_draft;
alter function public.submit_application(uuid) rename to submit_legacy_application;
revoke all on function public.save_legacy_application_draft(uuid,text,text,text,text,uuid[],jsonb),public.submit_legacy_application(uuid) from public,anon,authenticated;
create function public.save_application_draft(p_recruitment_cycle_id uuid,p_motivation text,p_experience_summary text,p_github_url text,p_portfolio_url text,p_domain_ids uuid[],p_answers jsonb default '[]') returns public.applications
language plpgsql security definer set search_path=public as $$
begin
 if public.current_role() is distinct from 'applicant'::public.app_role then raise exception 'Only applicants may save applications'; end if;
 if not exists(select 1 from public.applications where applicant_id=auth.uid() and recruitment_cycle_id=p_recruitment_cycle_id and form_schema is null) then raise exception 'Use this drive''s published application form'; end if;
 return public.save_legacy_application_draft(p_recruitment_cycle_id,p_motivation,p_experience_summary,p_github_url,p_portfolio_url,p_domain_ids,p_answers);
end; $$;
create function public.submit_application(p_application_id uuid) returns public.applications
language plpgsql security definer set search_path=public as $$
declare a public.applications; c public.recruitment_cycles;
begin
 if public.current_role() is distinct from 'applicant'::public.app_role then raise exception 'Only applicants may submit applications'; end if;
 select * into a from public.applications where id=p_application_id and applicant_id=auth.uid();
 if not found then raise exception 'Application not found'; end if;
 if a.form_schema is null then return public.submit_legacy_application(p_application_id); end if;
 select * into c from public.recruitment_cycles where id=a.recruitment_cycle_id for share;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||c.id::text,0));
 select * into a from public.applications where id=p_application_id for update;
 if a.status<>'draft' then raise exception 'Only draft applications may be submitted'; end if;
 if c.status<>'open' or now()<c.application_open or now()>=c.application_close then raise exception 'This recruitment cycle is not accepting applications'; end if;
 perform public.validate_application_form_values(a.form_schema,a.form_values,true,auth.uid());
 update public.applications set status='submitted',submitted_at=now() where id=a.id returning * into a;
 insert into public.notifications(user_id,title,message,type) values(auth.uid(),'Application submitted','Your application was submitted successfully.','application');
 return a;
end; $$;

create function public.application_file_is_locked(p_path text) returns boolean
language sql stable security definer set search_path=public as $$
 select case when split_part(p_path,'/',1) is distinct from auth.uid()::text then true else exists(
   select 1 from public.applications a,jsonb_array_elements(a.form_schema->'sections') s,jsonb_array_elements(s->'fields') f
   where a.applicant_id=auth.uid() and a.status<>'draft' and f->>'type'='file' and a.form_values->>(f->>'id')=p_path
 ) end;
$$;
create policy "retain submitted form attachments" on storage.objects as restrictive for delete to authenticated
 using(bucket_id<>'private-applicant-files' or not public.application_file_is_locked(name));

-- Convert existing drive layouts rather than deleting/replacing any application.
-- The college choices are explicitly supplied by the owner. New drives start
-- with no form until an admin builds and publishes one.
create function public.migration_form_field(p_id text,p_label text,p_type text,p_binding text,p_required boolean,p_options jsonb default '[]',p_max integer default 3) returns jsonb
language sql immutable as $$ select jsonb_build_object('id',p_id,'label',p_label,'type',p_type,'binding',p_binding,'required',p_required,'help','','placeholder','','options',p_options,'maxSelections',p_max); $$;
do $$
declare c public.recruitment_cycles; schema jsonb; sections jsonb; years jsonb; domains jsonb; questions jsonb;
begin
 select coalesce(jsonb_agg(jsonb_build_object('value',id::text,'label',name) order by display_order,id),'[]') into domains from public.domains where active;
 for c in select * from public.recruitment_cycles loop
   select jsonb_agg(jsonb_build_object('value',year,'label',case year when 'FY' then 'First Year (FY)' else 'Second Year (SY)' end)) into years
     from unnest(case upper(trim(c.target_batch)) when 'FY' then array['FY'] when 'SY' then array['SY'] else array['FY','SY'] end) year;
   select coalesce(jsonb_agg(public.migration_form_field('q_'||q.id,q.question,case q.question_type when 'single_choice' then 'select' else q.question_type end,'',q.required,
     coalesce((select jsonb_agg(jsonb_build_object('value',value,'label',value)) from jsonb_array_elements_text(q.options)), '[]')) order by q.display_order,q.id),'[]') into questions
     from public.recruitment_questions q where q.recruitment_cycle_id=c.id and q.active;
   sections:=jsonb_build_array(
     jsonb_build_object('id','personal','title','Personal Details','description','','fields',jsonb_build_array(
       public.migration_form_field('full_name','Full name','short_text','profile.full_name',true),
       public.migration_form_field('email','Account email','email','identity.email',false),
       public.migration_form_field('phone','Phone','phone','profile.phone',true),
       public.migration_form_field('branch','Branch','select','profile.branch',true,'[{"value":"CE","label":"CE"},{"value":"IT","label":"IT"},{"value":"ENTC","label":"ENTC"},{"value":"AIDS","label":"AIDS"},{"value":"ECE","label":"ECE"}]'),
       public.migration_form_field('division','Class / division','short_text','profile.division',true),
       public.migration_form_field('year','Year','select','profile.year',true,years))),
     jsonb_build_object('id','technical','title','Technical Profile','description','','fields',jsonb_build_array(
       public.migration_form_field('skills','Skills','short_text','profile.skills',false),
       public.migration_form_field('languages','Programming languages','short_text','profile.programming_languages',false),
       public.migration_form_field('experience', 'Projects you''ve built','long_text','application.experience_summary',false),
       public.migration_form_field('github','GitHub','url','profile.github_url',false),
       public.migration_form_field('portfolio','Portfolio','url','profile.portfolio_url',false)))
   );
   if jsonb_array_length(domains)>0 then sections:=sections||jsonb_build_array(jsonb_build_object('id','domains','title','Domain Preference','description','','fields',jsonb_build_array(public.migration_form_field('domain_preferences','Domain preferences','domains','domains',true,domains,c.max_preferences)))); end if;
   sections:=sections||jsonb_build_array(jsonb_build_object('id','questions','title','Questions','description','','fields',jsonb_build_array(public.migration_form_field('motivation','Why do you want to join Robotics Club?','long_text','application.motivation',true))||questions));
   schema:=jsonb_build_object('title',c.name,'description','','sections',sections);
   perform public.validate_application_form_schema(schema,true,c.id);
   insert into public.recruitment_application_forms(recruitment_cycle_id,draft_schema,published_schema,published_revision,published_at)
     values(c.id,schema,schema,1,now());
 end loop;
end; $$;
drop function public.migration_form_field(text,text,text,text,boolean,jsonb,integer);

revoke all on function public.validate_application_form_schema(jsonb,boolean,uuid),public.validate_application_form_values(jsonb,jsonb,boolean,uuid) from public,anon,authenticated;
revoke all on function public.save_application_form(uuid,jsonb,integer),public.publish_application_form(uuid,integer),public.unpublish_application_form(uuid,integer),
 public.get_published_application_form(uuid),public.save_built_application_draft(uuid,integer,jsonb),public.save_application_draft(uuid,text,text,text,text,uuid[],jsonb),public.submit_application(uuid),public.application_file_is_locked(text) from public,anon;
grant execute on function public.save_application_form(uuid,jsonb,integer),public.publish_application_form(uuid,integer),public.unpublish_application_form(uuid,integer),
 public.get_published_application_form(uuid),public.save_built_application_draft(uuid,integer,jsonb),public.save_application_draft(uuid,text,text,text,text,uuid[],jsonb),public.submit_application(uuid),public.application_file_is_locked(text) to authenticated;
notify pgrst, 'reload schema';
